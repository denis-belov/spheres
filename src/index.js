/*
eslint-disable

no-magic-numbers,
max-statements,
prefer-destructuring,
no-bitwise,
max-params,
*/



import './index.scss';

import * as THREE from 'three';
import { MathDebug } from '@3d-smile/glkit';



const dpr = window.devicePixelRatio || 1;

const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;

const gl = canvas.getContext('webgl2');

gl.viewport(0, 0, window.innerWidth, window.innerHeight);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);



class Camera {

	constructor (fov, aspect, near, far, zoom) {

		this.quaternion = new MathDebug.Quat();
		this.translation = new MathDebug.Vec3();

		this.transformation_matrix =
			new MathDebug.Mat4(

				new Float32Array(

					[
						1, 0, 0, 0,
						0, 1, 0, 0,
						0, 0, 1, 0,
						0, 0, 0, 1,
					],
				),
			);

		this.view_matrix =
			new MathDebug.Mat4(

				new Float32Array(

					[
						1, 0, 0, 0,
						0, 1, 0, 0,
						0, 0, 1, 0,
						0, 0, 0, 1,
					],
				),
			);

		this.projection_matrix =
			new MathDebug.Mat4(

				new Float32Array(

					[
						1, 0, 0, 0,
						0, 1, 0, 0,
						0, 0, 1, 0,
						0, 0, 0, 1,
					],
				),
			);



		this.uniform_buffer = gl.createBuffer();



		const top = near * Math.tan(0.017453292 * 0.5 * fov) / zoom;
		const height = 2 * top;
		const width = aspect * height;
		const left = -0.5 * width;

		this.projection_matrix
			.makePerspectiveProjection(left, left + width, top, top - height, near, far);



		gl.bindBuffer(gl.UNIFORM_BUFFER, this.uniform_buffer);
		gl.bufferData(gl.UNIFORM_BUFFER, 48 * 4, gl.DYNAMIC_DRAW);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.transformation_matrix.arr);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 16 * 4, this.view_matrix.arr);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 32 * 4, this.projection_matrix.arr);

		this.uniform_buffer_binding = 0;

		gl.bindBufferRange(gl.UNIFORM_BUFFER, this.uniform_buffer_binding, this.uniform_buffer, 0, 48 * 4);



		const canvas_mousemove_callback = (evt) => {

			this.quaternion.postRotateX(-evt.movementY * 0.01);
			this.quaternion.postRotateY(-evt.movementX * 0.01);

			this.updateTransformationAndViewMatrices();
		};

		canvas.addEventListener('mousedown', () => window.addEventListener('mousemove', canvas_mousemove_callback));
		canvas.addEventListener('mouseup', () => window.removeEventListener('mousemove', canvas_mousemove_callback));

		window.addEventListener('wheel', (evt) => {

			this.translation.arr[2] += Math.sign(evt.deltaY) * 0.2;

			this.transformation_matrix
				.makeTranslation(this.translation, 1)
				.preRotateQuat(this.quaternion);

			this.updateTransformationAndViewMatrices();
		});

		window.addEventListener(

			'resize',

			() => this.updateProjectionMatrix(45, window.innerWidth / window.innerHeight, 0.1, 100, 1),
		);
	}

	updateTransformationAndViewMatrices () {

		this.transformation_matrix
			.makeTranslation(this.translation, 1)
			.preRotateQuat(this.quaternion);

		this.view_matrix
			.copy(this.transformation_matrix)
			.inverseTransformNoScale();

		gl.bindBuffer(gl.UNIFORM_BUFFER, this.uniform_buffer);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.transformation_matrix.arr);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 16 * 4, this.view_matrix.arr);
	}

	updateProjectionMatrix (fov, aspect, near, far, zoom) {

		const top = near * Math.tan(0.017453292 * 0.5 * fov) / zoom;
		const height = 2 * top;
		const width = aspect * height;
		const left = -0.5 * width;

		this.projection_matrix
			.makePerspectiveProjection(left, left + width, top, top - height, near, far);



		gl.bindBuffer(gl.UNIFORM_BUFFER, this.uniform_buffer);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 32 * 4, this.projection_matrix.arr);
	}
}



class Sphere {

	static tree_depth = 4;



	constructor (center, radius, camera, detail) {

		this.center = center;

		this.radius = radius;

		this.program = gl.createProgram();

		{
			this.vertex_shader_code =

				`#version 300 es

				precision highp int;
				precision highp float;

				layout (location = 0) in vec3 in_position;
				layout (location = 1) in vec3 in_normal;

				out vec4 v_world_position;
				out vec4 v_camera_position;
				out vec3 v_color;
				out vec3 v_normal;

				layout (std140) uniform Camera

					{
						mat4 transformation_matrix;

						mat4 view_matrix;

						mat4 projection_matrix;
					};

				void main (void)

					{
						v_world_position = vec4(in_position, 1.0);
						v_camera_position = transformation_matrix[3];
						v_color = v_world_position.xyz;
						v_normal = in_normal;

						gl_Position = projection_matrix * view_matrix * v_world_position;
					}
				`;

			this.vertex_shader = gl.createShader(gl.VERTEX_SHADER);

			gl.shaderSource(this.vertex_shader, this.vertex_shader_code);
			gl.compileShader(this.vertex_shader);

			if (!gl.getShaderParameter(this.vertex_shader, gl.COMPILE_STATUS)) {

				const _error =
					`\n${ this.vertex_shader_code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

				throw new Error(`${ _error }${ gl.getShaderInfoLog(this.vertex_shader) }`);
			}

			gl.attachShader(this.program, this.vertex_shader);



			this.fragment_shader_code =

				`#version 300 es

				precision highp int;
				precision highp float;

				uniform vec3 light_position;

				in vec4 v_world_position;
				in vec4 v_camera_position;
				in vec3 v_color;
				in vec3 v_normal;

				out vec4 frag_color;

				void main (void) {

					float diffuse =
						dot(

							normalize(cross(dFdx(v_world_position.xyz), dFdy(v_world_position.xyz))),

							normalize(v_camera_position.xyz + vec3(1.0) - v_world_position.xyz)
						);

					frag_color = vec4((vec3(0.3) + vec3(diffuse)) * vec3(0.7), 1.0);
				}
				`;

			this.fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

			gl.shaderSource(this.fragment_shader, this.fragment_shader_code);
			gl.compileShader(this.fragment_shader);

			if (!gl.getShaderParameter(this.fragment_shader, gl.COMPILE_STATUS)) {

				const _error =
					`\n${ this.fragment_shader_code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

				throw new Error(`${ _error }${ gl.getShaderInfoLog(this.fragment_shader) }`);
			}

			gl.attachShader(this.program, this.fragment_shader);



			gl.linkProgram(this.program);



			gl.uniformBlockBinding(

				this.program,
				gl.getUniformBlockIndex(this.program, 'Camera'),
				camera.uniform_buffer_binding,
			);



			this.vertex_buffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);

			gl.enableVertexAttribArray(0);

			this.normal_buffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);

			gl.enableVertexAttribArray(1);

			this.index_data = [];
			this.index_buffer = gl.createBuffer();

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);

			// this.vertex_array = gl.createVertexArray();

			const icosahedron_geometry = new THREE.IcosahedronGeometry(this.radius, detail);
			icosahedron_geometry.translate(this.center.arr[0], this.center.arr[1], this.center.arr[2]);

			this.position_data = Array.prototype.slice.call(icosahedron_geometry.attributes.position.array);
			this.normal_data = Array.prototype.slice.call(icosahedron_geometry.attributes.normal.array);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.position_data), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normal_data), gl.STATIC_DRAW);
		}

		this.positions = [];

		for (let i = 0; i < this.position_data.length; i += 9) {

			const v1 =
				new MathDebug.Vec3()
					.set(this.position_data[i + 0], this.position_data[i + 1], this.position_data[i + 2]);

			const v2 =
				new MathDebug.Vec3()
					.set(this.position_data[i + 3], this.position_data[i + 4], this.position_data[i + 5]);

			const v3 =
				new MathDebug.Vec3()
					.set(this.position_data[i + 6], this.position_data[i + 7], this.position_data[i + 8]);

			this.positions.push(v1, v2, v3);
		}

		this.tree = this.makeSphereSegmentTree(this.positions, 0, 0);

		this.edge_triangles = [];
		this.nearest_triangles = [];

		this._v1 = new MathDebug.Vec3();
		this._v2 = new MathDebug.Vec3();
		this._v3 = new MathDebug.Vec3();
		this._a = new MathDebug.Vec3();
		this._b = new MathDebug.Vec3();
		this._c = new MathDebug.Vec3();
	}

	makeSphereSegmentTree (positions, counter, _rotation) {

		const tree = [];

		const positions1 = [];
		const positions2 = [];



		// x' = x cos θ − y sin θ
		// y' = x sin θ + y cos θ



		for (let i = 0; i < positions.length; i += 3) {

			const v1 = positions[i + 0];
			const v2 = positions[i + 1];
			const v3 = positions[i + 2];

			const _cos = Math.cos(_rotation);
			const _sin = Math.sin(_rotation);

			const d1 = ((v1.arr[0] - this.center.arr[0]) * _cos) + ((v1.arr[1] - this.center.arr[1]) * _sin);
			const d2 = ((v2.arr[0] - this.center.arr[0]) * _cos) + ((v2.arr[1] - this.center.arr[1]) * _sin);
			const d3 = ((v3.arr[0] - this.center.arr[0]) * _cos) + ((v3.arr[1] - this.center.arr[1]) * _sin);

			if (

				d1 >= 0 ||
				d2 >= 0 ||
				d3 >= 0
			) {

				positions1.push(v1, v2, v3);
			}

			if (

				d1 <= 0 ||
				d2 <= 0 ||
				d3 <= 0
			) {

				positions2.push(v1, v2, v3);
			}
		}

		if (counter === Sphere.tree_depth - 1) {

			// tree.push(positions1, positions2);

			tree.push(

				this.makeYPositionTree(positions1),

				this.makeYPositionTree(positions2),
			);
		}
		else {

			let rotation1 = _rotation;
			let rotation2 = _rotation;

			const next_counter = counter + 1;

			rotation1 += Math.PI / (2 * next_counter);
			rotation2 -= Math.PI / (2 * next_counter);

			const tree1 = this.makeSphereSegmentTree(positions1, next_counter, rotation1);
			const tree2 = this.makeSphereSegmentTree(positions2, next_counter, rotation2);

			tree.push(tree1, tree2);
		}

		return tree;
	}

	makeYPositionTree (positions) {

		const tree = [];

		const positions1 = [];
		const positions2 = [];



		for (let i = 0; i < positions.length; i += 3) {

			const v1 = positions[i + 0];
			const v2 = positions[i + 1];
			const v3 = positions[i + 2];

			if (

				v1.arr[1] >= this.center.arr[1] ||
				v2.arr[1] >= this.center.arr[1] ||
				v3.arr[1] >= this.center.arr[1]
			) {

				positions1.push(v1, v2, v3);
			}

			if (

				v1.arr[1] <= this.center.arr[1] ||
				v2.arr[1] <= this.center.arr[1] ||
				v3.arr[1] <= this.center.arr[1]
			) {

				positions2.push(v1, v2, v3);
			}
		}

		tree.push(positions1, positions2);

		return tree;
	}

	determinePoint (point) {

		let positions = this.tree;

		let rotation = 0;

		for (let i = 0; i < Sphere.tree_depth; ++i) {

			const _cos = Math.cos(rotation);
			const _sin = Math.sin(rotation);

			const d = ((point.arr[0] - this.center.arr[0]) * _cos) + ((point.arr[1] - this.center.arr[1]) * _sin);

			if (d >= 0) {

				positions = positions[0];

				rotation += Math.PI / (2 * (i + 1));
			}
			else {

				positions = positions[1];

				rotation -= Math.PI / (2 * (i + 1));
			}
		}


		if (point.arr[1] >= this.center.arr[1]) {

			positions = positions[0];
		}
		else {

			positions = positions[1];
		}



		let result = false;

		for (let i = 0; i < positions.length; i += 3) {

			const v1 = positions[i + 0];
			const v2 = positions[i + 1];
			const v3 = positions[i + 2];

			result = this._v1
				.copy(point)
				.from(this.center)
				.intersectTriangle(point, v1, v2, v3);

			if (result) {

				break;
			}
		}

		return result;
	}

	triangulate (sphere, _inverse) {

		this.edge_triangles.forEach((t1) => {

			const intersections = [];

			sphere.edge_triangles.forEach((t0) => {

				this._a.copy(t0.v[0]).to(t0.v[1]);
				this._b.copy(t0.v[1]).to(t0.v[2]);
				this._c.copy(t0.v[2]).to(t0.v[0]);

				{
					const int =
						this._a
							.clone()
							.intersectTriangle(t0.v[0], t1.v[0], t1.v[1], t1.v[2]);

					int && this._a.dot(this._v1.copy(t0.v[1]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._b
							.clone()
							.intersectTriangle(t0.v[1], t1.v[0], t1.v[1], t1.v[2]);

					int && this._b.dot(this._v1.copy(t0.v[2]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._c
							.clone()
							.intersectTriangle(t0.v[2], t1.v[0], t1.v[1], t1.v[2]);

					int && this._c.dot(this._v1.copy(t0.v[0]).to(int)) <= 0 && intersections.push(int);
				}



				this._a.copy(t1.v[0]).to(t1.v[1]);
				this._b.copy(t1.v[1]).to(t1.v[2]);
				this._c.copy(t1.v[2]).to(t1.v[0]);

				{
					const int =
						this._a
							.clone()
							.intersectTriangle(t1.v[0], t0.v[0], t0.v[1], t0.v[2]);

					int && this._a.dot(this._v1.copy(t1.v[1]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._b
							.clone()
							.intersectTriangle(t1.v[1], t0.v[0], t0.v[1], t0.v[2]);

					int && this._b.dot(this._v1.copy(t1.v[2]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._c
							.clone()
							.intersectTriangle(t1.v[2], t0.v[0], t0.v[1], t0.v[2]);

					int && this._c.dot(this._v1.copy(t1.v[0]).to(int)) <= 0 && intersections.push(int);
				}
			});



			sphere.nearest_triangles.forEach((t0) => {

				this._a.copy(t0.v[0]).to(t0.v[1]);
				this._b.copy(t0.v[1]).to(t0.v[2]);
				this._c.copy(t0.v[2]).to(t0.v[0]);

				{
					const int =
						this._a
							.clone()
							.intersectTriangle(t0.v[0], t1.v[0], t1.v[1], t1.v[2]);

					int && this._a.dot(this._v1.copy(t0.v[1]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._b
							.clone()
							.intersectTriangle(t0.v[1], t1.v[0], t1.v[1], t1.v[2]);

					int && this._b.dot(this._v1.copy(t0.v[2]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._c
							.clone()
							.intersectTriangle(t0.v[2], t1.v[0], t1.v[1], t1.v[2]);

					int && this._c.dot(this._v1.copy(t0.v[0]).to(int)) <= 0 && intersections.push(int);
				}



				this._a.copy(t1.v[0]).to(t1.v[1]);
				this._b.copy(t1.v[1]).to(t1.v[2]);
				this._c.copy(t1.v[2]).to(t1.v[0]);

				{
					const int =
						this._a
							.clone()
							.intersectTriangle(t1.v[0], t0.v[0], t0.v[1], t0.v[2]);

					int && this._a.dot(this._v1.copy(t1.v[1]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._b
							.clone()
							.intersectTriangle(t1.v[1], t0.v[0], t0.v[1], t0.v[2]);

					int && this._b.dot(this._v1.copy(t1.v[2]).to(int)) <= 0 && intersections.push(int);
				}

				{
					const int =
						this._c
							.clone()
							.intersectTriangle(t1.v[2], t0.v[0], t0.v[1], t0.v[2]);

					int && this._c.dot(this._v1.copy(t1.v[0]).to(int)) <= 0 && intersections.push(int);
				}
			});



			if (intersections.length) {

				this.position_data.fill(Infinity, t1.index, t1.index + 9);
				this.normal_data.fill(Infinity, t1.index, t1.index + 9);



				let [ _in ] = t1.v.filter((v) => v.in);
				let [ out1, out2 ] = t1.v.filter((v) => !v.in).sort((a, b) => (t1.v.indexOf(a) - t1.v.indexOf(b)));
				let inverse = false;

				if (!out2) {

					[ _in ] = t1.v.filter((v) => !v.in);
					[ out1, out2 ] = t1.v.filter((v) => v.in).sort((a, b) => (t1.v.indexOf(a) - t1.v.indexOf(b)));
					inverse = true;
				}



				const intersections_sorted = intersections.sort((a, b) => (a.distance(out1) - b.distance(out1)));

				const normal_h =
					(
						Math.pow(out1.distance(_in), 2) -
						Math.pow(_in.distance(out2), 2) -
						Math.pow(out1.distance(out2), 2)
					) /
					(2 * out1.distance(out2));

				const normal_proj =
					this._v1
						.copy(out2)
						.add(

							this._v2
								.copy(out1)
								.to(out2)
								.normalize()
								.mulS(normal_h),
						);

				const normal =
					this._v3
						.copy(_in)
						.to(normal_proj);
					// .normalize();



				const intersections_extended =
					intersections_sorted
						.map(

							(intersection) =>
								_in
									.clone()
									.to(intersection)
									// .normalize()
									.intersectPlane(_in, normal, normal_proj),
						);



				if (

					(_inverse && inverse) ||
					(!_inverse && !inverse)
				) {

					for (let i = 0; i < intersections_sorted.length - 1; ++i) {

						const tr = [ _in, intersections_sorted[i], intersections_sorted[i + 1] ];

						this.position_data.push(...tr[0].arr, ...tr[1].arr, ...tr[2].arr);
						this.normal_data.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
					}
				}
				else {

					for (let i = 0; i < intersections_sorted.length - 1; ++i) {

						const tr1 = [ intersections_sorted[i], intersections_sorted[i + 1], intersections_extended[i] ];

						this.position_data.push(...tr1[0].arr, ...tr1[1].arr, ...tr1[2].arr);
						this.normal_data.push(0, 0, 0, 0, 0, 0, 0, 0, 0);

						const tr2 = [

							intersections_extended[i],
							intersections_sorted[i + 1],
							intersections_extended[i + 1],
						];

						this.position_data.push(...tr2[0].arr, ...tr2[1].arr, ...tr2[2].arr);
						this.normal_data.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
					}
				}
			}
		});
	}

	subtract (sphere) {

		for (let i = 0; i < this.positions.length; i += 3) {

			const v1 = this.positions[i + 0];
			const v2 = this.positions[i + 1];
			const v3 = this.positions[i + 2];

			const d1 = sphere.determinePoint(v1);
			const d2 = sphere.determinePoint(v2);
			const d3 = sphere.determinePoint(v3);

			if (d1 && d2 && d3) {

				this.position_data.fill(Infinity, i * 3, (i * 3) + 9);
				this.normal_data.fill(Infinity, i * 3, (i * 3) + 9);
			}
			else {

				let triangle_is_on_edge = false;
				let triangle_is_nearby_edge = false;

				if (d1) {

					triangle_is_on_edge = true;

					v1.in = true;
				}

				if (d2) {

					triangle_is_on_edge = true;

					v2.in = true;
				}

				if (d3) {

					triangle_is_on_edge = true;

					v3.in = true;
				}

				if (

					(
						Math.abs(v1.distance(sphere.center) - sphere.radius) < 0.025 ||
						Math.abs(v2.distance(sphere.center) - sphere.radius) < 0.025 ||
						Math.abs(v3.distance(sphere.center) - sphere.radius) < 0.025
					)
				) {

					triangle_is_nearby_edge = true;
				}

				if (triangle_is_on_edge) {

					this.edge_triangles.push(

						{
							v: [ v1, v2, v3 ],

							index: i * 3,
						},
					);
				}
				else if (triangle_is_nearby_edge) {

					this.nearest_triangles.push(

						{
							v: [ v1, v2, v3 ],

							index: i * 3,
						},
					);
				}
			}
		}



		for (let i = 0; i < sphere.positions.length; i += 3) {

			const v1 = sphere.positions[i + 0];
			const v2 = sphere.positions[i + 1];
			const v3 = sphere.positions[i + 2];

			const d1 = this.determinePoint(v1, 1);
			const d2 = this.determinePoint(v2, 1);
			const d3 = this.determinePoint(v3, 1);

			if (!d1 && !d2 && !d3) {

				sphere.position_data.fill(Infinity, i * 3, (i * 3) + 9);
				sphere.normal_data.fill(Infinity, i * 3, (i * 3) + 9);
			}
			else {

				let triangle_is_on_edge = false;
				let triangle_is_nearby_edge = false;

				if (d1) {

					triangle_is_on_edge = true;

					v1.in = true;
				}

				if (d2) {

					triangle_is_on_edge = true;

					v2.in = true;
				}

				if (d3) {

					triangle_is_on_edge = true;

					v3.in = true;
				}

				if (

					(
						Math.abs(v1.distance(this.center) - this.radius) < 0.025 ||
						Math.abs(v2.distance(this.center) - this.radius) < 0.025 ||
						Math.abs(v3.distance(this.center) - this.radius) < 0.025
					)
				) {

					triangle_is_nearby_edge = true;
				}

				if (triangle_is_on_edge) {

					sphere.edge_triangles.push(

						{
							v: [ v1, v2, v3 ],

							index: i * 3,
						},
					);
				}
				else if (triangle_is_nearby_edge) {

					sphere.nearest_triangles.push(

						{
							v: [ v1, v2, v3 ],

							index: i * 3,
						},
					);
				}
			}
		}



		this.triangulate(sphere, true);
		sphere.triangulate(this, false);



		this.position_data = this.position_data.filter((value) => value !== Infinity);
		this.normal_data = this.normal_data.filter((value) => value !== Infinity);

		sphere.position_data = sphere.position_data.filter((value) => value !== Infinity);
		sphere.normal_data = sphere.normal_data.filter((value) => value !== Infinity);



		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.position_data), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normal_data), gl.STATIC_DRAW);



		gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.position_data), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normal_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normal_data), gl.STATIC_DRAW);
	}

	draw () {

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, 0, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, 0, 0, 0);
		gl.useProgram(this.program);
		gl.drawArrays(gl.TRIANGLES, 0, this.position_data.length / 3);
	}
}



const camera = new Camera(45, window.innerWidth / window.innerHeight, 0.1, 100, 1);

camera.translation.arr[2] += 10;
camera.updateTransformationAndViewMatrices();



const sphere1_center_coordinates = [ 0, 0, 0 ];
const sphere1_radius = 1;

const sphere2_center_coordinates = [ 0.5, 0.5, 0.5 ];
const sphere2_radius = 0.5;

const DETAIL = 8;

const sphere1 = new Sphere(new MathDebug.Vec3().set(...sphere1_center_coordinates), sphere1_radius, camera, DETAIL);
const sphere2 = new Sphere(new MathDebug.Vec3().set(...sphere2_center_coordinates), sphere2_radius, camera, DETAIL);

sphere1.subtract(sphere2);



const spheres = [

	sphere1,
	sphere2,
];



const render = () => {

	gl.clearColor(0.5, 0.5, 0.5, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	spheres.forEach((sphere) => sphere.draw());

	requestAnimationFrame(render);
};

render();



// console commands

window._update = (s1x, s1y, s1z, s1r, s2x, s2y, s2z, s2r, detail) => {

	console.warn('wait');

	spheres.length = 0;

	const _sphere1 = new Sphere(new MathDebug.Vec3().set(s1x, s1y, s1z), s1r, camera, detail);
	const _sphere2 = new Sphere(new MathDebug.Vec3().set(s2x, s2y, s2z), s2r, camera, detail);

	_sphere1.subtract(_sphere2);

	spheres.push(_sphere1, _sphere2);

	console.warn('mesh updated');
};

window._setTreeDepth = (depth) => {

	Sphere.tree_depth = depth;

	console.warn('tree depth updated');
};



console.log('v2');
