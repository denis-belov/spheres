// #ifdef __EMSCRIPTEN__
//   #define __SSE__ 1
//   #define __SSE2__ 1
//   #define __SSE3__ 1
//   #include <SSE/immintrin.h>
// // #include <wasm_simd128.h>
// #else
//   #include <immintrin.h>
// #endif

// // __m128 set128__ (void* data, const float x, const float y, const float z, const float w) {

// //   // _mm_store_ps((float*) data, wasm_f32x4_make(x, y, z, w));

// //  return  _mm_setr_ps(x, y, z, w);

// //   // ((float*) data)[0] = 1.0;
// // };

// void set128__ (__m128* data, const float x, const float y, const float z, const float w) {

//   alignas(16) __m128 asd = _mm_setr_ps(x, y, z, w);

//   _mm_store_ps((float*) data, asd);
// };

int extern_function (void) {

	return 178;
}
