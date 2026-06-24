import { describe, it, expect } from 'vitest';
import { renderMarkdown, stripMarkdown, escapeHtml } from './markdown';

describe('renderMarkdown', () => {
	it('grassetto', () => {
		expect(renderMarkdown('**ciao**')).toBe('<strong>ciao</strong>');
	});

	it('corsivo e codice inline', () => {
		expect(renderMarkdown('*x*')).toContain('<em>x</em>');
		expect(renderMarkdown('usa `npm`')).toContain('<code');
		expect(renderMarkdown('usa `npm`')).toContain('npm</code>');
	});

	it('a capo -> <br>', () => {
		expect(renderMarkdown('a\nb')).toBe('a<br>b');
	});

	it('liste puntate -> <ul><li>', () => {
		const html = renderMarkdown('- uno\n- due');
		expect(html).toContain('<ul');
		expect(html).toContain('<li>uno</li>');
		expect(html).toContain('<li>due</li>');
	});

	it('NON esegue HTML (XSS): tag diventano testo', () => {
		const html = renderMarkdown('<script>alert(1)</script>');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('grassetto applicato anche dopo escaping di < >', () => {
		expect(renderMarkdown('1 < 2 e **vero**')).toBe('1 &lt; 2 e <strong>vero</strong>');
	});

	it('stringa vuota -> vuota', () => {
		expect(renderMarkdown('')).toBe('');
	});
});

describe('stripMarkdown (per TTS)', () => {
	it('rimuove asterischi e backtick', () => {
		expect(stripMarkdown('**ciao** e `npm` e *x*')).toBe('ciao e npm e x');
	});
	it('rimuove i bullet a inizio riga', () => {
		expect(stripMarkdown('- uno\n- due')).toBe('uno\ndue');
	});
	it('link -> solo testo', () => {
		expect(stripMarkdown('vedi [la guida](/guida)')).toBe('vedi la guida');
	});
	it('non lascia asterischi residui (es. streaming parziale)', () => {
		expect(stripMarkdown('**non chiuso')).not.toContain('*');
		expect(stripMarkdown('a *** b')).not.toContain('*');
	});
});

describe('escapeHtml', () => {
	it('escapa i caratteri pericolosi', () => {
		expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
	});
});
