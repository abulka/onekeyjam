// @ts-check

/**
 * A small Markdown renderer for the in-app Help pages. It supports the subset
 * used by `doco/IMPROVISING-TUTORIAL.md`: headings, paragraphs, unordered and
 * ordered lists, bold, italic, inline code, links, blockquotes, horizontal
 * rules, fenced code blocks and GitHub-style tables. The input is our own
 * trusted documentation, so it is HTML-escaped but not otherwise sanitised.
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
            html.push(`<li>${currentItem}</li>`);
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
            html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
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
            currentItem = inline(unordered[1]);
            i++;
            continue;
        }

        const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
        if (ordered) {
            flushParagraph();
            openList('ol');
            flushItem();
            currentItem = inline(ordered[1]);
            i++;
            continue;
        }

        // An indented line while a list is open is a continuation of the
        // current item (soft-wrapped text in the markdown source).
        if (listType !== null && currentItem !== null && /^\s+\S/.test(line)) {
            currentItem += ` ${inline(line.trim())}`;
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
