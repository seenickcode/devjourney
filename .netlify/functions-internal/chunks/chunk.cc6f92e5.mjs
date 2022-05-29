// Static
						const frontmatter = {"setup":"import Layout from '../../layouts/Main.astro';\n","title":"scoped_model","publishDate":"21 May 2021","name":"Nick Manning","value":128,"description":"scoped_model","duration":"10 min read"};
						const file = "/Users/seenickcode/code/devjourney/src/pages/basicflutter/02-scoped-model.md";
						const url = "/basicflutter/02-scoped-model";
						
						// Deferred
						async function load() {
							return (await import('../entry.mjs').then(function (n) { return n.a; }));
						}						function Content(...args) {
							return load().then((m) => m.default(...args))
						}
						Content.isAstroComponentFactory = true;
						function getHeaders() {
							return load().then((m) => m.metadata.headers)
						}

export { Content, load as default, file, frontmatter, getHeaders, url };
