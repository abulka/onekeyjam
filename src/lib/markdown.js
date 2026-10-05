// @ts-check

/**
 * A small Markdown renderer for the in-app Help pages. It supports the subset
 * used by `doco/IMPROVISING-TUTORIAL.md` and `doco/REFERENCE.md`: headings,
 * paragraphs, unordered and ordered lists, bold, italic, inline code, links,
 * blockquotes, horizontal rules, fenced code blocks and GitHub-style tables.
 * Headings get stable `id`s, and `extractHeadings()` returns them so the Help
 * pages can build a sticky section navigation. The input is our own trusted
 * documentation, so it is HTML-escaped but not otherwise sanitised.
 */

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @param {string} text */
function inline(text) {
    let result = escapeHtml(text);
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    result = result.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return result;
}

/**
 * Heading text with the inline markdown removed, for ids and navigation labels.
 * @param {string} text
 * @returns {string}
 */
function plainHeading(text) {
    return text
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .trim();
}

/**
 * A URL-friendly version of heading text.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
    const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'section';
}

/**
 * A unique id for a heading within one document.
 * @param {string} base
 * @param {Set<string>} used
 * @returns {string}
 */
function uniqueId(base, used) {
    let id = base;
    let n = 2;
    while (used.has(id)) {
        id = `${base}-${n}`;
        n++;
    }
    used.add(id);
    return id;
}

/**
 * @typedef {object} MarkdownHeading
 * @property {number} level 1-6
 * @property {string} text plain heading text, without markdown
 * @property {string} id anchor id used in the rendered HTML
 */

/**
 * The headings in a Markdown document, in order, with the same ids that
 * `renderMarkdown` puts on the rendered heading elements. Used to build the
 * Help pages' section navigation.
 * @param {string} markdown
 * @returns {Array<MarkdownHeading>}
 */
export function extractHeadings(markdown) {
    const headings = [];
    const used = new Set();
    for (const line of String(markdown).replace(/\r\n/g, '\n').split('\n')) {
        const match = line.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
            const text = plainHeading(match[2]);
            headings.push({ level: match[1].length, text, id: uniqueId(slugify(text), used) });
        }
    }
    return headings;
}

/**
 * @param {Array<string>} lines
 * @param {number} start index of the header row
 * @param {Array<string>} html
 * @returns {number} index after the table
 */
function renderTable(lines, start, html) {
    const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    const header = cells(lines[start]);
    let i = start + 2;
    const rows = [];
    while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
    }
    html.push('<table class="md-table"><thead><tr>'
        + header.map((cell) => `<th>${inline(cell)}</th>`).join('')
        + '</tr></thead><tbody>'
        + rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
        + '</tbody></table>');
    return i;
}

/**
 * Render a Markdown string to HTML.
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
    const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
    // Pre-compute the heading ids so the rendered headings and
    // extractHeadings() always agree, including duplicate-heading suffixes.
    const headings = extractHeadings(markdown);
    let headingIndex = 0;
    const html = [];
    let i = 0;
    let listType = /** @type {'ul'|'ol'|null} */ (null);
    let currentItem = null;
    let paragraph = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            html.push(`<p>${inline(paragraph.join(' '))}</p>`);
            paragraph = [];
        }
    };
    const flushItem = () => {
        if (currentItem !== null) {
            // Format the whole item at once, so inline markup that wraps across
            // source lines (for example a long **bold** run) is still matched.
            html.push(`<li>${inline(currentItem)}</li>`);
            currentItem = null;
        }
    };
    const closeList = () => {
        flushItem();
        if (listType) {
            html.push(`</${listType}>`);
            listType = null;
        }
    };
    const openList = (type) => {
        if (listType !== type) {
            closeList();
            html.push(`<${type}>`);
            listType = type;
        }
    };
    const flushAll = () => {
        flushParagraph();
        closeList();
    };

    while (i < lines.length) {
        const line = lines[i];

        if (/^```/.test(line)) {
            flushAll();
            const language = line.slice(3).trim();
            const code = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) {
                code.push(lines[i]);
                i++;
            }
            i++;
            html.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flushAll();
            const level = heading[1].length;
            const record = headings[headingIndex];
            headingIndex++;
            const id = record ? record.id : uniqueId(slugify(plainHeading(heading[2])), new Set());
            html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
            i++;
            continue;
        }

        if (/^\s*---+\s*$/.test(line)) {
            flushAll();
            html.push('<hr>');
            i++;
            continue;
        }

        if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
            flushAll();
            i = renderTable(lines, i, html);
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            flushAll();
            const quote = [];
            while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
                quote.push(lines[i].replace(/^\s*>\s?/, ''));
                i++;
            }
            html.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
            continue;
        }

        const unordered = line.match(/^\s*[-*]\s+(.*)$/);
        if (unordered) {
            flushParagraph();
            openList('ul');
            flushItem();
            currentItem = unordered[1];
            i++;
            continue;
        }

        const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
        if (ordered) {
            flushParagraph();
            openList('ol');
            flushItem();
            currentItem = ordered[1];
            i++;
            continue;
        }

        // An indented line while a list is open is a continuation of the
        // current item (soft-wrapped text in the markdown source). Keep it raw:
        // flushItem() runs the inline formatting once the item is complete.
        if (listType !== null && currentItem !== null && /^\s+\S/.test(line)) {
            currentItem += ` ${line.trim()}`;
            i++;
            continue;
        }

        if (/^\s*$/.test(line)) {
            // A blank line ends the current item but keeps the list open, so
            // loose lists keep their numbering.
            flushParagraph();
            flushItem();
            i++;
            continue;
        }

        closeList();
        paragraph.push(line.trim());
        i++;
    }

    flushAll();
    return html.join('\n');
}
