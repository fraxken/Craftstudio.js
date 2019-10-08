"use strict";

// Require Node.js Dependencies
const { join } = require("path");

// Require Third-party Dependencies
const webpack = require("webpack");

// CONSTANTS
const kBuildDir = join(__dirname, "build");

module.exports = {
    entry: [
        join(kBuildDir, "Renderer.js"),
        join(kBuildDir, "Model.js")
    ],
    node: {
        __dirname: true,
        __filename: true
    },
    target: "electron-main",
    mode: "none",
    optimization: {
        usedExports: true
    },
    output: {
        filename: "renderer.js",
        path: join(__dirname, "dist")
    },
    plugins: [new webpack.ProvidePlugin({ THREE: "three" })]
};
