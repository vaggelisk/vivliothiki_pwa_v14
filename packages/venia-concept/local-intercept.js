/* eslint-disable */
/**
 * Custom interceptors for the project.
 *
 * This project has a section in its package.json:
 *    "pwa-studio": {
 *        "targets": {
 *            "intercept": "./local-intercept.js"
 *        }
 *    }
 *
 * This instructs Buildpack to invoke this file during the intercept phase,
 * as the very last intercept to run.
 *
 * A project can intercept targets from any of its dependencies. In a project
 * with many customizations, this function would tap those targets and add
 * or modify functionality from its dependencies.
 */

function localIntercept(targets) {
    const builtins = targets.of('@magento/pwa-buildpack');

    builtins.transformUpward.tap(definitions => {
        const veniaResponse = definitions?.veniaResponse;
        if (!veniaResponse || !Array.isArray(veniaResponse.when)) {
            return;
        }

        const resolverName = 'generatedSitemap';
        definitions[resolverName] = {
            inline: {
                status: 200,
                headers: {
                    resolver: 'inline',
                    inline: {
                        'content-type': {
                            inline: 'application/xml'
                        },
                        'cache-control': {
                            inline: 's-maxage=3600'
                        }
                    }
                },
                body: {
                    resolver: 'file',
                    parse: {
                        inline: 'text'
                    },
                    encoding: {
                        inline: 'utf8'
                    },
                    file: {
                        resolver: 'inline',
                        inline: './sitemap.xml'
                    }
                }
            }
        };

        veniaResponse.when.unshift({
            matches: 'request.url.pathname',
            pattern: '^/sitemap\\.xml$',
            use: resolverName
        });
    });
}

module.exports = localIntercept;
