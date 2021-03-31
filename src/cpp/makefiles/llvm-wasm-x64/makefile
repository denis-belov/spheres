SRC=/home/denis/reps/denis-belov/webapp/src/cpp/src
BUILD=/home/denis/reps/denis-belov/webapp/src/cpp/build/llvm-wasm-x64

$(BUILD)/output/wasm/main.wasm : $(BUILD)/internal/o/main.o $(BUILD)/internal/o/func.o 
	mkdir -p $(BUILD)/output/wasm && mkdir -p $(BUILD)/output/dcmp && wasm-ld $(BUILD)/internal/o/main.o $(BUILD)/internal/o/func.o -mwasm32 --export-all --no-entry -o $(BUILD)/output/wasm/main.wasm && wasm-decompile $(BUILD)/output/wasm/main.wasm -o $(BUILD)/output/dcmp/main.dcmp

$(BUILD)/internal/o/main.o : $(SRC)/main.cpp 
	mkdir -p $(BUILD)/internal/o && mkdir -p $(BUILD)/internal/dcmp && clang++ $(SRC)/main.cpp -c -std=c++20 --target=wasm32 -O3 -msimd128 --no-standard-libraries -Wall -Wextra -Wpedantic -I $(SRC) -o $(BUILD)/internal/o/main.o

$(BUILD)/internal/o/func.o : $(SRC)/func.cpp 
	mkdir -p $(BUILD)/internal/o && mkdir -p $(BUILD)/internal/dcmp && clang++ $(SRC)/func.cpp -c -std=c++20 --target=wasm32 -O3 -msimd128 --no-standard-libraries -Wall -Wextra -Wpedantic -I $(SRC) -o $(BUILD)/internal/o/func.o
