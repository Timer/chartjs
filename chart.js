/*global module:true*/
'use strict';

Math.log2 = Math.log2 || function(x) {
  return Math.log(x) / Math.LN2;
};

Math.log10 = Math.log10 || function(x) {
  return Math.log(x) / Math.LN10;
};

(function() {
  var Helpers = {
    avg: function(arr) {
      var v = 0;
      for (var index = 0; index < arr.length; ++index) {
        v += arr[index];
      }
      return v / arr.length;
    },
    min: function(arr) {
      if (arr.length === 0) return 0;
      var v = arr[0];
      for (var index = 1; index < arr.length; ++index) {
        var v2 = arr[index];
        if (Array.isArray(v2)) v2 = Helpers.avg(v2);
        if (v2 < v) v = v2;
      }
      return Math.max(0, v);
    },
    max: function(arr) {
      var v = 0;
      for (var index = 0; index < arr.length; ++index) {
        var v2 = arr[index];
        if (Array.isArray(v2)) v2 = Helpers.avg(v2);
        if (v2 > v) v = v2;
      }
      return Math.max(0, v);
    },
    upperMax: function(arr) {
      var v = 0;
      for (var index = 0; index < arr.length; ++index) {
        var v2 = arr[index];
        if (Array.isArray(v2)) v2 = Helpers.max(v2);
        if (v2 > v) v = v2;
      }
      return Math.max(0, v);
    },
    niceNumbers: function(range, round) {
      var exponent = Math.floor(Math.log10(range));
      var fraction = range / Math.pow(10, exponent);
      var niceFraction;
      if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
      } else {
        if (fraction <= 1.0) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
      }
      return niceFraction * Math.pow(10, exponent);
    },
    getLinearTicks: function(min, max, maxTicks) {
      var range = Helpers.niceNumbers(max - min, false);
      var tickSpacing = Helpers.niceNumbers(range / (maxTicks - 1), true);
      return [
        Math.floor(min / tickSpacing) * tickSpacing,
        Math.ceil(max / tickSpacing) * tickSpacing,
        tickSpacing
      ];
    }
  };

  var BarChart = (function() {
    function BarChart(ctx, options) {
      this.options = {
        font: 'Helvetica',
        fontSize_title: 24,
        fontSize_axis: 20,
        fontSize_ticks: 18,
        fontSize_labels: 18,
        barPaddingPercent: 0.10,
        tickPaddingPercent: 0.10,
        padding_vertical: 10,
        padding_horizontal: 10,
        padding_ticks: 10,
        fillColor_background: 'rgb(220, 220, 220)',
        strokeColor_bar: 'rgb(0, 0, 0)',
        fillColor_bar: 'rgb(180, 180, 180)',
        scaleStyle: 'linear'
      };
      options = options || { };
      for (var key in this.options) {
        if (options.hasOwnProperty(key)) this.options[key] = options[key];
      }
      this.ctx = ctx;
      this.content = { };
    }

    BarChart.prototype.update = function(content) {
      if (typeof content !== 'object') {
        throw new Error('Collections must be objects.');
      } else if (!(content.hasOwnProperty('labels') && content.hasOwnProperty('data'))) {
        throw new Error('Collection must specify labels and data.');
      } else if (!(Array.isArray(content.labels) && Array.isArray(content.data))) {
        throw new Error('Labels and data must be arrays.');
      } else if (content.labels.length !== content.data.length) {
        throw new Error('Labels and data length must match.');
      }
      if (this.options.scaleStyle === 'log2') {
        for (var i = 0; i < content.data.length; ++i) {
          if (Array.isArray(content.data[i])) {
            for (var i2 = 0; i2 < content.data[i].length; ++i2) content.data[i][i2] = Math.log2(content.data[i][i2]);
          } else content.data[i] = Math.log2(content.data[i]);
        }
      }
      this.content = content;
      this.redraw();
    };

    BarChart.prototype.redraw = function() {
      setTimeout(function() {
        this._draw();
      }.bind(this), 0);
    };

    BarChart.prototype._draw = function() {
      var options = this.options;
      var ctx = this.ctx, content = this.content;
      ctx.translate(-0.5, -0.5);
      var width = ctx.canvas.width, height = ctx.canvas.height;
      var remainingWidth = width, remainingHeight = height;
      var index;

      if (options.fillColor_background != null) {
        ctx.save();
        ctx.fillStyle = options.fillColor_background;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      var topYPadding = options.padding_horizontal;
      remainingHeight -= options.padding_horizontal;
      ctx.fillStyle = 'rgb(0, 0, 0)';
      /* Draw title of bar chart */
      if (content.title != null) {
        ctx.save();
        ctx.font = options.fontSize_title + 'px ' + options.font;
        ctx.textAlign = 'center';
        ctx.fillText(content.title, width / 2, topYPadding + options.fontSize_title);
        ctx.restore();
        remainingHeight -= options.fontSize_title * 1.25;
        topYPadding += options.fontSize_title * 1.25;
      }

      /* Compute required left padding */
      var leftXPadding = options.padding_vertical;
      remainingWidth  -= options.padding_vertical;

      var leftXDrawYLabel = null;
      if (content.yAxis != null) {
        leftXDrawYLabel = leftXPadding + options.fontSize_axis * 0.5;
        remainingWidth -= options.fontSize_axis * 1.25;
        leftXPadding += options.fontSize_axis * 1.25;
      }

      ctx.save();
      ctx.font = options.fontSize_ticks + 'px ' + options.font;
      var maxChartValue = Helpers.upperMax(content.data);
      var maxYAxisTickWidth = options.scaleStyle == 'log2' ? Math.ceil(Math.pow(2, maxChartValue)) : maxChartValue;
      maxYAxisTickWidth = ctx.measureText(Math.max(maxYAxisTickWidth, 100)).width;
      maxYAxisTickWidth = Math.ceil(maxYAxisTickWidth) + options.padding_ticks;
      remainingWidth -= maxYAxisTickWidth;
      leftXPadding += maxYAxisTickWidth;
      ctx.restore();

      var rightXPadding = options.padding_vertical;
      remainingWidth -= options.padding_vertical;

      /* Draw x-axis label of bar chart */
      var bottomYPadding = options.padding_horizontal;
      remainingHeight -= options.padding_horizontal;
      if (content.xAxis != null) {
        ctx.save();
        ctx.font = options.fontSize_axis + 'px ' + options.font;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.fillText(content.xAxis, (width - remainingWidth) + remainingWidth / 2, height - bottomYPadding);
        remainingHeight -= options.fontSize_axis;
        bottomYPadding += options.fontSize_axis;
        ctx.restore();
      }

      /* Draw x-axis labels */
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = options.fontSize_labels + 'px ' + options.font;
      var widthPerBar = remainingWidth / content.data.length;
      var computedBarPadding = Math.floor((widthPerBar * options.barPaddingPercent) / 2);
      for (index = 0; index < content.labels.length; ++index) {
        ctx.fillText(
          content.labels[index],
          leftXPadding + index * widthPerBar + widthPerBar / 2,
          height - options.fontSize_labels / 2 - bottomYPadding
        );
      }
      remainingHeight -= options.fontSize_labels * 1.5;
      ctx.restore();

      /* Draw boundaries */
      ctx.save();
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.beginPath();
      ctx.moveTo(leftXPadding, topYPadding);
      ctx.lineTo(leftXPadding, topYPadding + remainingHeight);
      ctx.lineTo(leftXPadding + remainingWidth, topYPadding + remainingHeight);
      ctx.stroke();
      ctx.restore();

      /* Draw y-axis label of bar chart */
      if (content.yAxis != null) {
        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(Math.PI * 1.5);
        ctx.font = options.fontSize_axis + 'px ' + options.font;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.fillText(content.yAxis, -(topYPadding + remainingHeight / 2), leftXDrawYLabel);
        ctx.restore();
      }

      /* Draw y-axis labels */
      ctx.save();
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.font = options.fontSize_ticks + 'px ' + options.font;
      ctx.textAlign = 'right';
      var tickMeta = Helpers.getLinearTicks(0, maxChartValue, Math.max(2, remainingHeight / (options.fontSize_ticks * (1 + options.tickPaddingPercent))));
      maxChartValue = tickMeta[1] + Math.ceil(maxChartValue / options.fontSize_ticks);
      var ticks = [];
      while (tickMeta[0] <= tickMeta[1]) {
        ticks.push(tickMeta[0]);
        tickMeta[0] += tickMeta[2];
      }
      for (index = 0; index < ticks.length; ++index) {
        var tickHeight = Math.round(remainingHeight * (ticks[index] / maxChartValue));
        if (options.scaleStyle == 'log2' && ticks[index] !== 0) ticks[index] = Math.round(Math.pow(2, ticks[index]));
        ctx.fillText(ticks[index] + '', leftXPadding - options.padding_ticks, topYPadding + remainingHeight - tickHeight);
      }
      ctx.restore();

      /* Draw bars */
      ctx.save();
      ctx.strokeStyle = options.strokeColor_bar;
      ctx.fillStyle = options.fillColor_bar;
      for (index = 0; index < content.data.length; ++index) {
        var v = content.data[index];
        if (Array.isArray(v)) v = Helpers.avg(v);
        var renderBarHeight = Math.round(remainingHeight * (v / maxChartValue));
        ctx.beginPath();
        ctx.moveTo(leftXPadding + widthPerBar * index + computedBarPadding, topYPadding + remainingHeight);
        ctx.lineTo(leftXPadding + widthPerBar * index + computedBarPadding, topYPadding + remainingHeight - renderBarHeight);
        ctx.lineTo(leftXPadding + widthPerBar * index + (widthPerBar - 1) - computedBarPadding, topYPadding + remainingHeight - renderBarHeight);
        ctx.lineTo(leftXPadding + widthPerBar * index + (widthPerBar - 1) - computedBarPadding, topYPadding + remainingHeight);
        ctx.stroke();
        ctx.fill();
      }
      ctx.restore();
    };

    return BarChart;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = BarChart;
  } else {
    window.BarChart = BarChart;
  }
})();
