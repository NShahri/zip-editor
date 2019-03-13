'use strict';

const presets = [['@babel/preset-env', {targets:{node: '10'}}], '@babel/preset-flow'];
const plugins= [];

if (process.env['BABEL_ENV'] === 'esm') {
    presets[0] = [
        '@babel/preset-env',
        {
            loose: false,
            modules: false,
            targets: {
                esmodules: true,
            },
            shippedProposals: true,
        },
    ];
}

if (process.env['BABEL_ENV'] === 'esm' || process.env['BABEL_ENV'] === 'cjs') {
    plugins.push('@babel/plugin-transform-runtime');
}

module.exports = {presets, plugins};
