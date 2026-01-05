#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { SitemapStream, streamToPromise } = require('sitemap');
const fetch = require('node-fetch');

const SITE_URL = process.env.SITE_URL || 'https://vivliothiki.net';
const GRAPHQL_ENDPOINT = process.env.MAGENTO_BACKEND_URL
    ? `${process.env.MAGENTO_BACKEND_URL}/graphql`
    : null;

if (!GRAPHQL_ENDPOINT) {
    console.error('MAGENTO_BACKEND_URL env var is required.');
    process.exit(1);
}

const queryWithoutCms = `
query SitemapData($pageSize: Int = 100, $currentPage: Int = 1) {
    categories(filters: { parent_id: { eq: "2" } }) {
        items {
            url_path
            updated_at
        }
    }
    products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
        items {
            url_key
            updated_at
        }
        page_info {
            current_page
            page_size
            total_pages
        }
    }
}
`;

const queryWithCms = `
query SitemapData($pageSize: Int = 100, $currentPage: Int = 1) {
    categories(filters: { parent_id: { eq: "2" } }) {
        items {
            url_path
            updated_at
        }
    }
    products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
        items {
            url_key
            updated_at
        }
        page_info {
            current_page
            page_size
            total_pages
        }
    }
    cmsPages {
        items {
            identifier
            url_key
            update_time
        }
    }
}
`;

async function fetchGraphQL(includeCmsPages = true) {
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: includeCmsPages ? queryWithCms : queryWithoutCms })
    });

    if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const json = await response.json();

    if (json.errors) {
        const cmsNotSupported = json.errors.some(error =>
            typeof error.message === 'string' &&
            error.message.includes('Cannot query field "cmsPages"')
        );

        if (includeCmsPages && cmsNotSupported) {
            console.warn('cmsPages query is not supported by this backend. Retrying without CMS pages.');
            return fetchGraphQL(false);
        }
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json.data;
}

function buildLinks(data) {
    const links = [{ url: '/', changefreq: 'daily', priority: 1 }];

    data.categories.items.forEach(category => {
        if (!category.url_path) return;
        links.push({
            url: `/${category.url_path}/`,
            lastmod: category.updated_at || undefined,
            changefreq: 'weekly'
        });
    });

    data.products.items.forEach(product => {
        if (!product.url_key) return;
        links.push({
            url: `/product/${product.url_key}.html`,
            lastmod: product.updated_at || undefined,
            changefreq: 'weekly'
        });
    });

    (data.cmsPages?.items || []).forEach(page => {
        if (!page.url_key) return;
        links.push({
            url: `/${page.url_key}/`,
            lastmod: page.update_time || undefined,
            changefreq: 'monthly'
        });
    });

    return links;
}

async function generate() {
    const data = await fetchGraphQL();
    const links = buildLinks(data);

    const sitemap = new SitemapStream({ hostname: SITE_URL });
    links.forEach(link => sitemap.write(link));
    sitemap.end();

    const xml = await streamToPromise(sitemap);
    const outputPath = path.resolve(__dirname, '../sitemap.xml');
    fs.writeFileSync(outputPath, xml.toString());

    console.log(`Generated sitemap with ${links.length} URLs at ${outputPath}`);
}

generate().catch(err => {
    console.error(err);
    process.exit(1);
});
