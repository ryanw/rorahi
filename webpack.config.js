const path = require('path');
const webpack = require('webpack');

const production = (process.env.NODE_ENV === 'production');

module.exports = {
	mode: production ? 'production' : 'development',
	entry: {
		rorahi: './src/index.ts',
		'example.kitchensink': './examples/kitchensink/kitchensink.ts',
		'example.simple': './examples/simple/simple.ts',
		'example.auckland': './examples/auckland/index.ts',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'rorahi',
		libraryTarget: 'umd',
	},
	devtool: 'source-map',
	devServer: {
		host: '0.0.0.0',
		port: 8088,
		historyApiFallback: true,
		static: {
			directory: __dirname,
		},
	},
	module: {
		rules: [
			// Typescript
			{ test: /\.ts$/, use: 'ts-loader' },

			// Shader files
			{ test: /\.glsl$/, use: ['raw-loader', 'glslify-loader'] },
		],
	},
	resolve: {
		extensions: [ '.ts', '.js' ],
		alias: {
			// For examples
			rorahi: path.resolve(__dirname, './src/index'),
		},
	},
	plugins: [
		new webpack.DefinePlugin({
			'PRODUCTION': JSON.stringify(production),
		}),
	],
}
