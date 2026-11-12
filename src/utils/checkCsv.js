const TARGET = 'Average of UnitPrice'

/*
Split one CSV line into fields while respecting double-quoted values
 (including embedded delimiters and "" escapes).
*/

function splitCsvLine(line, delimiter = ',') {
    const fields = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]

        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {   // escaped quote ""
                    cur += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                cur += ch
            }
        } else {
            if (ch === '"') {
                inQuotes = true
            } else if (ch === delimiter) {
                fields.push(cur)
                cur = ''
            } else {
                cur += ch
            }
        }
    }
    fields.push(cur)
    return fields.map((f) => f.trim())
}

export async function checkFile(file) {
    const base = { name: file.name, size: file.size }

    try {
        // Read only the head — we just need line 1
        const text = await file.slice(0, 4096).text()

        if (!text.trim()) {
            return { ...base, status: 'error', reason: 'Empty file', c1: '' }
        }

        // Strip BOM, grab first line
        const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0]

        // Sniff delimiter from the first line (comma vs semicolon vs tab)
        const delimiter = firstLine.includes('\t')
            ? '\t'
            : firstLine.split(';').length > firstLine.split(',').length
                ? ';'
                : ','

        // Quote-aware split, then grab field index 2 → column C
        const fields = splitCsvLine(firstLine, delimiter)
        const c1 = (fields[2] ?? '').trim()

        return {
            ...base,
            c1,
            status: c1 === TARGET ? 'pass' : 'fail',
        }
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