/**
 * ElasticNetsPrinter.
 *
 * @constructor
 */
function ElasticNetsPrinter(k, coordinates, norm_coordinates_data) {
    var Canvas, Image, canvas, ctx, _;
    Canvas = require('canvas');
    Image = Canvas.Image;
    ///canvas = new Canvas(600, 300, 'pdf');
    canvas = new Canvas(500, 500, 'pdf');
    ctx = canvas.getContext('2d');
    this.canvas = canvas;
    this._ = require('underscore');
    this.ctx = ctx;
    this.iteration = 1;
    this.coordinates = coordinates;
    this.norm_coordinates_data = norm_coordinates_data;
    this.norm_coordinates_width_interval = this.norm_coordinates_data['max_width'] - this.norm_coordinates_data['min_width'];
    this.norm_coordinates_height_interval = this.norm_coordinates_data['max_height'] - this.norm_coordinates_data['min_height'];
    this.k = k;
}

/**
 * Prints pages.
 */
ElasticNetsPrinter.prototype.printPages = function() {
    var fs = require('fs');
    fs.writeFile('out.pdf', this.canvas.toBuffer());
};

/**
 * Adds a page.
 *
 * @param neurons
 * @param k
 * @param iteration
 */
ElasticNetsPrinter.prototype.addPage = function(neurons, k, iteration) {
    var that = this;
    var ctx = this.ctx;
    ctx.font = '10px Impact';
    ctx.fillStyle = 'blue';
    ctx.fillText("iteration: " + iteration, 10, 20);
    ctx.fillText("k: " + k, 10, 50);
    ctx.stroke();

    this._.each(this.coordinates, function(value, i) {
        var radius = 2;
        ctx.beginPath();
        ctx.arc(value[0], value[1], radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#003300';
        ctx.stroke();
        ctx.fillText(i + 1, value[0], value[1]);
    });

    this._.each(neurons, function(neuron, i) {
        var radius = 1;
        ctx.beginPath();
        ctx.arc(
            neuron[0] * that.norm_coordinates_width_interval + that.norm_coordinates_data['min_width'],
            neuron[1] * that.norm_coordinates_height_interval + that.norm_coordinates_data['min_height'],
            radius,
            0,
            2 * Math.PI,
            false);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.stroke();
        ctx.fillText(i + 1, neuron[0] * that.norm_coordinates_width_interval + that.norm_coordinates_data['min_width'], neuron[1] * that.norm_coordinates_height_interval + that.norm_coordinates_data['min_height']);
    });
    ctx.addPage();
};

module.exports = ElasticNetsPrinter;
