// #include <string.h>
// #include <iostream>

// #include <emscripten.h>

// #ifdef __EMSCRIPTEN__
// 	#define __SSE__ 1
// 	#define __SSE2__ 1
// 	#define __SSE3__ 1
// 	#include <SSE/immintrin.h>
// // #include <wasm_simd128.h>
// #else
// 	#include <immintrin.h>
// #endif

// // #include <webgpu/webgpu.h>
// // #include "data/data.h"
// // #include "data/vec4/vec4-128.cpp"
// // #include "main.h"

// // alignas(16) float c[4] = { 6.0, 6.0, 6.0, 6.0 };
// // float* d;

// // extern void set128_ (void*, const float, const float, const float, const float);

// // extern void set128__ (__m128*, const float, const float, const float, const float);

// void EMSCRIPTEN_KEEPALIVE set32 (void* data, const float x, const float y, const float z, const float w) {

// 	float* _data = (float*) data;

// 	_data[0] = x;
// 	_data[1] = y;
// 	_data[2] = z;
// 	_data[3] = w;
// };

// void EMSCRIPTEN_KEEPALIVE set128 (void* data, const float x, const float y, const float z, const float w) {

// 	_mm_store_ps((float*) data, _mm_setr_ps(x, y, z, w));
// };

// float EMSCRIPTEN_KEEPALIVE test_func (void) {

// 	// float* d;

// 	// XGK::DATA::VEC4::simd32();

// 	// alignas(16) float c[4] = { 6.0, 6.0, 6.0, 6.0 };
// 	// alignas(16) v128_t c;
// 	// alignas(16) __m128 dd;
// 	// float* d = (float*) &dd;

// 	alignas(16) float d[4] = { 0.0, 0.0, 0.0, 0.0 };

// 	// XGK::DATA::VEC4::set32(c, 0.0, 98.0, 3.0, 4.0);
// 	set128(d, 1.0, 32.0, 3.0, 4.0);
// 	// set128(d, 1.0, 32.0, 3.0, 4.0);
// 	// set128(d, 1.0, 98.0, 3.0, 4.0);
// 	// set128__(&dd, 1.0, 98.0, 3.0, 4.0);
// 	// _mm_store_ps((float*) &d, _mm_set_ps(1.0, 98.0, 3.0, 4.0));

// 	// memcpy(c, c, 16);
// 	// memcpy(&d, &d, 16);

// 	// std::cout << sizeof(float) << std::endl;


// 	return d[1];
// };



/**
 * Description @xgk/cpp-webpack-load1er
 * @param {makefile} /src/cpp/makefiles/emcc-x64/makefile
 * @param {target} /src/cpp/build/emcc-x64/output/js/main.js
 * @param {watch_directories} "/src/cpp/src /src/cpp/build"
 */

/**
 * Description @xgk/cpp-webpack-loader
 * @param {makefile} /src/cpp/makefiles/llvm-wasm-x64/makefile
 * @param {target} /src/cpp/build/llvm-wasm-x64/output/wasm/main.wasm
 * @param {watch_directories} "/src/cpp/src /src/cpp/build"
 */



// #include <cstdint>
// #include <iostream>
// #include <emscripten/bind.h>



// using std::cout;
// using std::endl;



int extern_function (void);
double function_js (void);



// struct S {

// 	int i = 1;

// 	S (void) {

// 		i = 2;

// 		cout << "constructed" << endl;
// 	}

// 	~S (void) {

// 		cout << "destructed" << endl;
// 	}
// };



// int _main (void) {

// 	struct S s;

// 	cout << extern_function() << endl;

// 	return 0;
// }

// using fptr = double (*) (void);

// fptr ptr;

// void getJsFuncPtr (fptr _ptr) {

// 	ptr = _ptr;
// }

struct S {

	int a = 0;

	int b = 0;
};

int function_cpp (const double value) {

	// double sum = 0;

	// for (double i = 0; i < value; ++i) {

	// 	sum += i;
	// }

	S s;

	return s.a;
}

// EMSCRIPTEN_BINDINGS(MODULE) {

// 	emscripten::function("function_cpp", &function_cpp);
// }
