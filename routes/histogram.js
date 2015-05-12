function createArray(dimensions, value) {
	// Create new array
	var array = new Array(dimensions[0] || 0);
	var i = dimensions[0];
	// If dimensions array's length is bigger than 1
	// we start creating arrays in the array elements with recursions
	// to achieve multidimensional array
	if (dimensions.length > 1) {
		// Remove the first value from the array
		var args = Array.prototype.slice.call(dimensions, 1);
		// For each index in the created array create a new array with recursion
		while (i--) {
			array[dimensions[0] - 1 - i] = createArray(args, value);
		}
		// If there is only one element left in the dimensions array
		// assign value to each of the new array's elements if value is set as
		// param
	} else {
		if (typeof value !== 'undefined') {
			while (i--) {
				array[dimensions[0] - 1 - i] = value;
			}
		}
	}
	return array;
}

function Histogram2D(nx, xlow, xup, ny, ylow, yup) {
	this.arr = createArray([ nx, ny ], 0.0);
	this.nx = nx;
	this.xlow = xlow;
	this.xup = xup;
	this.ny = ny;
	this.ylow = ylow;
	this.yup = yup;
}

Histogram2D.prototype._bin = function(x, nx, xlow, xup) {
	var width = (xup - xlow) / nx;
	var id = Math.floor((x - xlow) / width);
	if (id < 0 || id >= nx) {
		return undefined;
	}
	return id;
}

Histogram2D.prototype.bin = function(x, coord) {
	if (coord == 'x') {
		return this._bin(x, this.nx, this.xlow, this.xup);
	}
	if (coord == 'y') {
		return this._bin(x, this.ny, this.ylow, this.yup);
	}
	return undefined;
}

Histogram2D.prototype.fill = function(x, y) {
	var i = this.bin(x, 'x');
	var j = this.bin(y, 'y');
	if (i == undefined || j == undefined) {
		return;
	}
	this.arr[i][j] = this.arr[i][j] + 1;
}

Histogram2D.prototype._center = function(id, nx, xlow, xup) {
	var width = (xup - xlow) / nx;
	return id * width + width / 2.0 + xlow;
}

Histogram2D.prototype.center = function(id, coord) {
	if (coord == 'x') {
		return this._center(id, this.nx, this.xlow, this.xup);
	}
	if (coord == 'y') {
		return this._center(id, this.ny, this.ylow, this.yup);
	}
	return undefined;
}

Histogram2D.prototype.get = function(i, j) {
	return this.arr[i][j];
}

Histogram2D.prototype.max = function() {
	var m = 0.0;
	for (var i = 0; i < this.nx; i++) {
		for (var j = 0; j < this.ny; j++) {
			m = Math.max(m, this.arr[i][j]);
		}
	}
	return m;
}

// export the class
module.exports = Histogram2D;