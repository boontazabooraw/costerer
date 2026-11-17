const TARGET = 'Average of UnitPrice'
const MAX_DECIMALS = 2

// Split one CSV line into fields, respecting double-quoted values.
function splitCsvLine(line, delimiter = ',') {
    const fields = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++ }
                else { inQuotes = false }
            } else { cur += ch }
        } else {
            if (ch === '"') { inQuotes = true }
            else if (ch === delimiter) { fields.push(cur); cur = '' }
            else { cur += ch }
        }
    }
    fields.push(cur)
    return fields.map((f) => f.trim())
}

// Count decimal places, ignoring trailing zeros. Returns null if not a number.
function decimalPlaces(value) {
    const s = String(value).trim()
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null
    const dot = s.indexOf('.')
    if (dot === -1) return 0
    const frac = s.slice(dot + 1).replace(/0+$/, '')
    return frac.length
}

export async function checkFile(file) {
    const base = { name: file.name, size: file.size }

    try {
        const text = await file.text()

        if (!text.trim()) {
            return { ...base, status: 'error', reason: 'Empty file', c1: '' }
        }

        const lines = text
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .filter((l) => l.length > 0)

        const firstLine = lines[0]

        // Delimiter sniff
        const delimiter = firstLine.includes('\t')
            ? '\t'
            : firstLine.split(';').length > firstLine.split(',').length
                ? ';'
                : ','

        // --- Check 1: C1 header (quote-aware split) ---
        const headerFields = splitCsvLine(firstLine, delimiter)
        const c1 = (headerFields[2] ?? '').trim()
        if (c1 !== TARGET) {
            return {
                ...base,
                c1,
                status: 'fail',
                reason: `C1 is "${c1}", expected "${TARGET}"`,
            }
        }

        // --- Check 2: no over-precise decimals in column C ---
        const badRows = []
        for (let i = 1; i < lines.length; i++) {
            const fields = splitCsvLine(lines[i], delimiter)
            const label = (fields[0] ?? '').trim().toLowerCase()
            if (label === 'grand total') continue   // skip summary row

            const cell = (fields[2] ?? '').trim()
            if (!cell) continue
            const dp = decimalPlaces(cell)
            if (dp !== null && dp > MAX_DECIMALS) {
                badRows.push({ row: i + 1, value: cell, dp })
            }
        }

        if (badRows.length > 0) {
            const first = badRows[0]
            const more = badRows.length > 1 ? ` (+${badRows.length - 1} more)` : ''
            return {
                ...base,
                c1,
                status: 'fail',
                reason: `Row ${first.row}: "${first.value}" has ${first.dp} decimals${more}`,
            }
        }

        return { ...base, c1, status: 'pass' }
    } catch (e) {
        return { ...base, status: 'error', reason: e.message, c1: '' }
    }
}

export async function checkFiles(files, onProgress) {
    const results = []
    for (let i = 0; i < files.length; i++) {
        results.push(await checkFile(files[i]))
        onProgress?.(i + 1, files.length)
    }
    return results
}