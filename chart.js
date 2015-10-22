'use strict';
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
    }
  };

  var BarChart = (function() {
    function BarChart(ctx) {
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
      this.content = content;
      this.redraw();
    };

    BarChart.prototype.redraw = function() {
      setTimeout(function() {
        this._draw();
      }.bind(this), 0);
    };

    BarChart.prototype._draw = function() {
      var options = {
        font: 'Helvetica',
        fontSize_title: 24,
        fontSize_axis: 20,
        fontSize_ticks: 18,
        fontSize_labels: 18,
        maxValue_padding: 0.25,
        barPaddingPercent: 0.10,
        padding_vertical: 20,
        fillColor_background: 'rgb(220, 220, 220)'
      };
      var ctx = this.ctx, content = this.content;
      var width = ctx.canvas.width, height = ctx.canvas.height;
      var remainingWidth = width, remainingHeight = height;

      if (options.fillColor_background != null) {
        ctx.save();
        ctx.fillStyle = options.fillColor_background;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      var topYPadding = 0;
      ctx.fillStyle = 'rgb(0, 0, 0)';
      /* Draw title of bar chart */
      if (content.title != null) {
        ctx.save();
        ctx.font = options.fontSize_title + 'px ' + options.font;
        ctx.textAlign = 'center';
        ctx.fillText(content.title, width / 2, options.fontSize_title);
        ctx.restore();
        remainingHeight -= options.fontSize_title * 1.25;
        topYPadding += options.fontSize_title * 1.25;
      }

      /* Compute required left padding */
      var leftXPadding = options.padding_vertical;
      remainingWidth  -= options.padding_vertical;

      ctx.save();
      ctx.font = options.fontSize_ticks + 'px ' + options.font;
      var maxChartValue = Helpers.upperMax(content.data) * (1 + options.maxValue_padding);
      var maxYAxisTickWidth = Math.ceil(ctx.measureText(maxChartValue + '').width);
      remainingWidth -= maxYAxisTickWidth;
      leftXPadding += maxYAxisTickWidth;
      ctx.restore();
      if (content.yAxis != null) {
        remainingWidth -= options.fontSize_axis * 1.25;
        leftXPadding += options.fontSize_axis * 1.25;
      }

      var rightXPadding = options.padding_vertical;
      remainingWidth -= options.padding_vertical;

      /* Draw x-axis label of bar chart */
      var bottomYPadding = 0;
      if (content.xAxis != null) {
        ctx.save();
        ctx.font = options.fontSize_axis + 'px ' + options.font;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.fillText(content.xAxis, (width - remainingWidth) + remainingWidth / 2, height - options.fontSize_axis / 2);
        remainingHeight -= options.fontSize_axis * 1.25;
        bottomYPadding += options.fontSize_axis * 1.25;
        ctx.restore();
      }

      /* Draw x-axis labels */
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = options.fontSize_labels + 'px ' + options.font;
      var widthPerBar = remainingWidth / content.data.length;
      var computedBarPadding = Math.floor((widthPerBar * options.barPaddingPercent) / 2);
      for (var index = 0; index < content.labels.length; ++index) {
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
        ctx.font = options.fontSize_axis + 'px ' + options.font;
        ctx.restore();
      }

      /* Draw y-axis labels */
      ctx.save();
      ctx.restore();

      /* Draw bars */
      ctx.save();
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.fillStyle = 'rgb(180, 180, 180)';
      for (var index = 0; index < content.data.length; ++index) {
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
