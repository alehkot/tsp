/**
 * TSPLib Matrix Parser.
 *
 * @param dimension
 * @param format
 * @constructor
 */
function TSPLibMatrixParser(dimension, format) {
    this.math = require('mathjs');
    this._ = require('underscore');
    this.next = [0, 0];
    this.dimension = dimension;
    this.matrix = this.math.zeros(dimension, dimension);
    this.format = format;
    this.used = false;
}

TSPLibMatrixParser.prototype.isUsed = function () {
    return this.used;
};

TSPLibMatrixParser.prototype.setNext = function (distances) {
    var that = this;
    var reversed = [];
    this.used = true;

    this._.each(distances, function (el) {
        if (that.format == 'LOWER_DIAG_ROW') {
            that.matrix.set(that.next, el);
            // Reflect the values.
            that.matrix.set([that.next[1], that.next[0]], el)

            if (that.next[0] == that.next[1]) {
                that.next[0]++;
                that.next[1] = 0;
            } else {
                that.next[1]++;
            }
        }
    });
};

TSPLibMatrixParser.prototype.getMatrix = function () {
    return this.matrix.toArray();
};

module.exports = TSPLibMatrixParser;
