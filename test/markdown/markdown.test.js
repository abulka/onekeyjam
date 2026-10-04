import assert from 'assert';
import { renderMarkdown } from '../../src/lib/markdown.js';

describe('markdown renderer', () => {

    it('renders headings and paragraphs with inline formatting', () => {
        const html = renderMarkdown('## Title\n\nSome **bold** and *italic* and `code`.');
        assert.ok(html.includes('<h2>Title</h2>'));
        assert.ok(html.includes('<strong>bold</strong>'));
        assert.ok(html.includes('<em>italic</em>'));
        assert.ok(html.includes('<code>code</code>'));
    });

    it('renders unordered and ordered lists', () => {
        const html = renderMarkdown('- one\n- two\n\n1. first\n2. second');
        assert.ok(html.includes('<ul>\n<li>one</li>\n<li>two</li>\n</ul>'));
        assert.ok(html.includes('<ol>\n<li>first</li>\n<li>second</li>\n</ol>'));
    });

    it('joins soft-wrapped list item continuation lines into one item', () => {
        const html = renderMarkdown('1. first line\n   continues here\n2. second');
        assert.ok(html.includes('<ol>\n<li>first line continues here</li>\n<li>second</li>\n</ol>'), html);
    });

    it('keeps a loose list (blank lines between items) in one list', () => {
        const html = renderMarkdown('1. first\n\n2. second');
        assert.ok(html.includes('<ol>\n<li>first</li>\n<li>second</li>\n</ol>'), html);
    });

    it('renders a table with a header row and body rows', () => {
        const html = renderMarkdown('| Chord | Scale |\n|---|---|\n| Dm7 | D dorian |\n| G7 | G mixolydian |');
        assert.ok(html.includes('<th>Chord</th>'));
        assert.ok(html.includes('<td>D dorian</td>'));
        assert.ok(html.includes('<td>G mixolydian</td>'));
    });

    it('escapes HTML in code blocks', () => {
        const html = renderMarkdown('```\n<script>alert(1)</script>\n```');
        assert.ok(html.includes('&lt;script&gt;'));
        assert.ok(!html.includes('<script>'));
    });

    it('renders links safely', () => {
        const html = renderMarkdown('See [the docs](https://example.com/page).');
        assert.ok(html.includes('<a href="https://example.com/page" target="_blank" rel="noopener">the docs</a>'));
    });

});
