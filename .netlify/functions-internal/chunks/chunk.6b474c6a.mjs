// Static
						const frontmatter = {"setup":"import Layout from '../../layouts/Main.astro';\n","title":"Welcome to basic flutter!","publishDate":"26 May 2021","name":"Nick Manning","value":128,"description":"Flutter basic setup.","duration":"1 min read"};
						const file = "/Users/seenickcode/code/devjourney/src/pages/advancedflutter/01-hello.md";
						const url = "/advancedflutter/01-hello";
						
						// Deferred
						async function load() {
							return (await import('../entry.mjs').then(function (n) { return n._; }));
						}						function Content(...args) {
							return load().then((m) => m.default(...args))
						}
						Content.isAstroComponentFactory = true;
						function getHeaders() {
							return load().then((m) => m.metadata.headers)
						}

export { Content, load as default, file, frontmatter, getHeaders, url };
