// Static
						const frontmatter = {"setup":"import Layout from '../../layouts/Main.astro';\n","title":"Hello, aspiring web developer!","publishDate":"25 May 2021","name":"Nick Manning","value":128,"description":"Welcome to the webdev journey!","duration":"quick read"};
						const file = "/Users/seenickcode/code/devjourney/src/pages/webdev/01-hello.md";
						const url = "/webdev/01-hello";
						
						// Deferred
						async function load() {
							return (await import('../entry.mjs').then(function (n) { return n.e; }));
						}						function Content(...args) {
							return load().then((m) => m.default(...args))
						}
						Content.isAstroComponentFactory = true;
						function getHeaders() {
							return load().then((m) => m.metadata.headers)
						}

export { Content, load as default, file, frontmatter, getHeaders, url };
