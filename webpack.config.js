const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = (env) => ({

	resolve: {

		extensions: [ '.js', '.scss' ],
	},

	output: {

		path: path.join(__dirname, 'build'),
	},

	module: {

		rules: [

			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: [
					'babel-loader',
					'eslint-loader',
				],
			},

			{
				test: /\.(css|scss)$/,
				use: [

					MiniCssExtractPlugin.loader,
					'css-loader',
					'sass-loader',
				],
			},

			{
				test: /\.pug$/,
				use: [

					'html-loader',
					'pug-html-loader',
				],
			},

			{
				test: /\.html$/,
				use: { loader: 'html-loader', options: { minimize: true } },
			},
		],
	},

	devtool: env === 'development' ? 'source-map' : false,

	plugins: [

		new CleanWebpackPlugin(),

		new MiniCssExtractPlugin({ filename: 'index.css' }),

		new OptimizeCSSAssetsPlugin({}),

		new HtmlWebpackPlugin({

			filename: path.join(__dirname, 'build/index.html'),
			template: path.join(__dirname, 'src/index.pug'),
			inject: 'body',
			minify: {

				removeAttributeQuotes: true,
			},
		}),

		new webpack.DefinePlugin({

			LOG: 'console.log',
		}),
	],

	devServer: {

		compress: true,
		historyApiFallback: true,
		host: 'localhost',
		port: 8080,
		open: true,
	},
});
