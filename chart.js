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
    },
    getFont: function(options) {
      options.style = options.style || 'normal';
      options.variant = options.variant || 'normal';
      options.weight = options.weight || 'lighter';
      options.size = options.size || '12';
      options.family = options.family || 'Arial';
      return [options.style, options.variant, options.weight, options.size + 'px', options.family].join(' ');
    }
  };

  var BarChart = (function() {
    function BarChart(ctx, options) {
      this.mouseListeners = [];
      this.currentHint = null;
      this.options = {
        font: 'Helvetica',
        fontWeight: 'normal',
        fontSizeTitle: 24,
        fontSizeAxes: 20,
        fontSizeTicks: 18,
        fontSizeLabels: 18,
        fontDataTags: 18,
        fontSizeLegend: 18,
        fontSizeHint: 18,
        paddingPercentBars: 0.10,
        paddingPercentTicks: 0.15,
        paddingPixelsVertical: 10,
        paddingPixelsHorizontal: 10,
        paddingPixelsTicks: 10,
        fillColorBackground: 'rgb(255, 255, 255)',
        strokeColorBars: 'rgb(0, 0, 0)',
        fillColorBars: 'rgba(180, 180, 180, 0.25)',
        scaleStyle: 'linear',
        barStyle: 'none',
        stackedBarPadding: 3,
        defaultMaxTick: 0,
        pixelsLegendSquare: 10,
        fillColorLegend: 'rgb(230, 230, 230)'
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
      content._data_standard_deviation = [];
      content._data_standard_error = [];
      for (var i = 0; i < content.data.length; ++i) {
        var isArr = Array.isArray(content.data[i]);
        if (this.options.scaleStyle === 'log2') {
          if (isArr) {
            for (var i3 = 0; i3 < content.data[i].length; ++i3) content.data[i][i3] = Math.log2(content.data[i][i3]);
          } else content.data[i] = Math.log2(content.data[i]);
        }
        if (isArr) {
          var mean = Helpers.avg(content.data[i]);
          var acc = 0;
          for (var i2 = 0; i2 < content.data[i].length; ++i2) acc += Math.pow(mean - content.data[i][i2], 2);
          acc = Math.sqrt(acc / (content.data[i].length - 1));
          content._data_standard_deviation.push(acc);
          content._data_standard_error.push(acc / Math.sqrt(content.data[i].length));
        } else {
          content._data_standard_deviation.push(0);
          content._data_standard_error.push(0);
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

    BarChart.prototype.mousemove = function(x, y) {
      var res = null;
      for (var index = 0; index < this.mouseListeners.length; ++index) {
        if ((res = this.mouseListeners[index](x, y))) break;
      }
      if (!res || (typeof res) !== 'object' || !res.hasOwnProperty('index') || !res.hasOwnProperty('drawIndex')) {
        if (this.currentHint !== null) {
          this.currentHint = null;
          this.redraw();
        }
        return;
      }
      var ch = this.currentHint;
      if (ch == null || ch.index != res.index || ch.drawIndex != res.drawIndex) {
        this.currentHint = res;
        this.redraw();
      }
    };

    BarChart.prototype._draw = function() {
      this.mouseListeners = [];

      var options = this.options;
      var ctx = this.ctx, content = this.content;
      var width = ctx.canvas.width, height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.translate(-0.5, -0.5);
      var remainingWidth = width, remainingHeight = height;
      var index;

      if (options.fillColorBackground != null) {
        ctx.save();
        ctx.fillStyle = options.fillColorBackground;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      var topYPadding = options.paddingPixelsHorizontal;
      remainingHeight -= options.paddingPixelsHorizontal;
      ctx.fillStyle = 'rgb(0, 0, 0)';
      /* Draw title of bar chart */
      if (content.title != null) {
        ctx.save();
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeTitle, family: options.font });
        ctx.textAlign = 'center';
        ctx.fillText(content.title, width / 2, topYPadding + options.fontSizeTitle);
        ctx.restore();
        remainingHeight -= options.fontSizeTitle * 1.25;
        topYPadding += options.fontSizeTitle * 1.25;
      }

      /* Compute required left padding */
      var leftXPadding = options.paddingPixelsVertical;
      remainingWidth  -= options.paddingPixelsVertical;

      var leftXDrawYLabel = null;
      if (content.yAxis != null) {
        leftXDrawYLabel = leftXPadding + options.fontSizeAxes * 0.5;
        remainingWidth -= options.fontSizeAxes * 1.25;
        leftXPadding += options.fontSizeAxes * 1.25;
      }

      ctx.save();
      ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeTicks, family: options.font });
      var maxChartValue;
      if (options.barStyle === 'stacked') {
        maxChartValue = 0;
        for (var cmIndex = 0; cmIndex < content.data.length; ++cmIndex) {
          var doB;
          if (Array.isArray(doB = content.data[cmIndex])) {
            var tempSum = 0;
            for (var ii2 = 0; ii2 < doB.length; ++ii2) tempSum += doB[ii2];
            maxChartValue = Math.max(maxChartValue, tempSum);
          } else maxChartValue = Math.max(maxChartValue, content.data[cmIndex]);
        }
      } else maxChartValue = Helpers.upperMax(content.data);
      if (options.defaultMaxTick > maxChartValue) maxChartValue = options.defaultMaxTick;
      var maxYAxisTickWidth = options.scaleStyle == 'log2' ? Math.ceil(Math.pow(2, maxChartValue)) : (Math.ceil(maxChartValue) + '.00');
      maxYAxisTickWidth = ctx.measureText(maxYAxisTickWidth).width;
      maxYAxisTickWidth = Math.ceil(maxYAxisTickWidth) + options.paddingPixelsTicks;
      remainingWidth -= maxYAxisTickWidth;
      leftXPadding += maxYAxisTickWidth;
      ctx.restore();

      var rightXPadding = options.paddingPixelsVertical;
      remainingWidth -= options.paddingPixelsVertical;

      /* Draw legend */
      if (content.legend != null && Array.isArray(content.legend)) {
        ctx.save();
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLegend, family: options.font });
        var maxLWidth = 0;
        for (var lIndex = 0; lIndex < content.legend.length; ++lIndex) {
          maxLWidth = Math.max(maxLWidth, ctx.measureText(content.legend[lIndex].label).width);
        }
        maxLWidth = Math.ceil(maxLWidth);
        maxLWidth += options.pixelsLegendSquare + 8;
        var legendEntriesPerLine = Math.floor((width - options.paddingPixelsHorizontal * 2) / maxLWidth);
        var lLReqHeight = Math.ceil(content.legend.length / legendEntriesPerLine) * options.fontSizeLegend * 1.5;
        remainingHeight -= lLReqHeight;
        bottomYPadding += lLReqHeight;

        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.fillStyle = options.fillColorLegend;
        var bSX, bSY;
        ctx.beginPath();
        ctx.moveTo(bSX = options.paddingPixelsHorizontal, bSY = topYPadding + remainingHeight);
        ctx.lineTo(width - bSX, bSY);
        ctx.lineTo(width - bSX, bSY + lLReqHeight);
        ctx.lineTo(bSX, bSY + lLReqHeight);
        ctx.lineTo(bSX, bSY);
        ctx.stroke();
        ctx.fill();

        for (var lIndex = 0; lIndex < content.legend.length; ++lIndex) {
          var legLine = Math.floor(lIndex / legendEntriesPerLine);
          var legCol = lIndex % legendEntriesPerLine;
          ctx.fillStyle = content.legend[lIndex].color;
          var boxX = bSX + legCol * maxLWidth + 3, boxY = bSY + legLine * options.fontSizeLegend * 1.5 + options.fontSizeLegend * 0.5;
          ctx.beginPath();
          ctx.moveTo(boxX, boxY);
          ctx.lineTo(boxX + options.pixelsLegendSquare, boxY);
          ctx.lineTo(boxX + options.pixelsLegendSquare, boxY + options.pixelsLegendSquare);
          ctx.lineTo(boxX, boxY + options.pixelsLegendSquare);
          ctx.lineTo(boxX, boxY);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgb(0, 0, 0)';
          ctx.fillText(content.legend[lIndex].label, boxX + 3 + options.pixelsLegendSquare, boxY + options.fontSizeLegend * 0.5);
        }

        ctx.restore();
      }

      /* Draw x-axis label of bar chart */
      var bottomYPadding = options.paddingPixelsHorizontal;
      remainingHeight -= options.paddingPixelsHorizontal;
      if (content.xAxis != null) {
        ctx.save();
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeAxes, family: options.font });
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.fillText(content.xAxis, (width - remainingWidth) + remainingWidth / 2, topYPadding + remainingHeight - bottomYPadding);
        remainingHeight -= options.fontSizeAxes;
        bottomYPadding += options.fontSizeAxes;
        ctx.restore();
      }

      var widthPerBar = remainingWidth / content.data.length;

      /* Draw x-axis top labels */
      if (content.topLabels != null) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLabels, family: options.font });
        remainingHeight -= options.fontSizeLabels * 1.5;
        topYPadding += options.fontSizeLabels * 1.5;
        for (index = 0; index < content.topLabels.length; ++index) {
          ctx.fillText(
            content.topLabels[index],
            leftXPadding + index * widthPerBar + widthPerBar / 2,
            topYPadding - options.fontSizeLabels / 2
          );
        }
        ctx.restore();
      }

      /* Draw x-axis labels */
      ctx.save();
      var reqWidth = 0;
      if (content.dataTags != null) {
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontDataTags, family: options.font });
        var dataTags = content.dataTags;
        for (var index = 0; index < dataTags.length; ++index) {
          if (Array.isArray(dataTags[index])) {
            for (var index2 = 0; index2 < dataTags[index].length; ++index2) {
              reqWidth = Math.max(reqWidth, Math.ceil(ctx.measureText(dataTags[index][index2]).width + 5));
            }
          } else {
            reqWidth = Math.max(reqWidth, Math.ceil(ctx.measureText(dataTags[index]).width + 5));
          }
        }
      }

      ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLabels, family: options.font });
      var computedBarPadding = Math.floor((widthPerBar * options.paddingPercentBars) / 2);
      var wwh = widthPerBar - computedBarPadding * 2;
      if (wwh < reqWidth) {
        computedBarPadding -= Math.ceil((reqWidth - wwh) / 2);
        computedBarPadding = Math.max(0, computedBarPadding);
      }
      var maxTextWidth = 0, maxTextStackSize = 1;
      for (index = 0; index < content.labels.length; ++index) {
        var tLabel = content.labels[index];
        if (Array.isArray(tLabel)) {
          maxTextStackSize = Math.max(maxTextStackSize, tLabel.length);
          for (var index2 = 0; index2 < tLabel.length; ++index2) {
            maxTextWidth = Math.max(maxTextWidth, ctx.measureText(tLabel[index2]).width);
          }
        } else maxTextWidth = Math.max(maxTextWidth, ctx.measureText(tLabel).width);
      }
      var xLabelsRotated = false;
      if (maxTextWidth > widthPerBar - computedBarPadding) {
        ctx.textAlign = 'right';
        ctx.rotate(Math.PI * 1.5);
        xLabelsRotated = true;
      } else {
        ctx.textAlign = 'center';
      }
      for (index = 0; index < content.labels.length; ++index) {
        var cLabel = content.labels[index];
        var x = leftXPadding + index * widthPerBar + widthPerBar / 2, y = topYPadding + remainingHeight - options.fontSizeLabels / 2;
        if (xLabelsRotated) {
          y = topYPadding + remainingHeight - maxTextWidth + 5;
          y = [x, x = -y][0];
        }
        var yUp = options.fontSizeLabels * (maxTextStackSize - 1);
        if (Array.isArray(cLabel)) {
          var yUp;
          if (xLabelsRotated) {
            yUp = options.fontSizeLabels * (cLabel.length - 1.5);
            yUp /= 2;
          }
          for (var index2 = 0; index2 < cLabel.length; ++index2) {
            ctx.fillText(cLabel[index2], x, y - yUp);
            yUp -= options.fontSizeLabels;
          }
        } else {
          if (xLabelsRotated) yUp = -options.fontSizeLabels * 0.25;
          ctx.fillText(cLabel, x, y - yUp);
        }
      }
      if (xLabelsRotated) {
        remainingHeight -= maxTextWidth + 5;
        bottomYPadding += maxTextWidth + 5;
      } else {
        var remVal = options.fontSizeLabels * maxTextStackSize;
        remVal += options.fontSizeLabels * 0.5;
        remainingHeight -= remVal;
        bottomYPadding += remVal;
      }
      ctx.restore();

      /* Draw boundaries */
      ctx.save();
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.beginPath();
      if (content.topLabels != null) {
        ctx.moveTo(leftXPadding + remainingWidth, topYPadding);
        ctx.lineTo(leftXPadding, topYPadding);
      } else {
        ctx.moveTo(leftXPadding, topYPadding);
      }
      ctx.lineTo(leftXPadding, topYPadding + remainingHeight);
      ctx.lineTo(leftXPadding + remainingWidth, topYPadding + remainingHeight);
      if (content.topLabels != null) ctx.lineTo(leftXPadding + remainingWidth, topYPadding);
      ctx.stroke();
      ctx.restore();

      /* Draw top label */
      if (content.topLabel != null) {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLabels, family: options.font });
        ctx.fillText(content.topLabel, leftXPadding - 3, topYPadding - options.fontSizeLabels / 2);
        ctx.restore();
      }

      /* Draw y-axis label of bar chart */
      if (content.yAxis != null) {
        ctx.save();
        ctx.rotate(Math.PI * 1.5);
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeAxes, family: options.font });
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.fillText(content.yAxis, -(topYPadding + remainingHeight / 2), leftXDrawYLabel);
        ctx.restore();
      }

      /* Draw y-axis labels */
      ctx.save();
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.20)';
      ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeTicks, family: options.font });
      ctx.textAlign = 'right';
      var tickMeta = Helpers.getLinearTicks(0, maxChartValue, Math.max(2, remainingHeight / (options.fontSizeTicks * (1 + options.paddingPercentTicks))));
      maxChartValue = tickMeta[1] + Math.ceil(maxChartValue / options.fontSizeTicks);
      var ticks = [];
      while (tickMeta[0] <= tickMeta[1]) {
        ticks.push(tickMeta[0]);
        tickMeta[0] += tickMeta[2];
      }
      for (index = 0; index < ticks.length; ++index) {
        var tickHeight = Math.round(remainingHeight * (ticks[index] / maxChartValue));
        if (options.scaleStyle == 'log2' && ticks[index] !== 0) ticks[index] = Math.round(Math.pow(2, ticks[index]));
        else ticks[index] = Math.floor(ticks[index] * 100) / 100;
        ctx.fillText(ticks[index] + '', leftXPadding - options.paddingPixelsTicks, topYPadding + remainingHeight - tickHeight);
        if (index == 0) continue;
        ctx.beginPath();
        ctx.moveTo(leftXPadding, topYPadding + remainingHeight - tickHeight);
        ctx.lineTo(leftXPadding + remainingWidth, topYPadding + remainingHeight - tickHeight);
        ctx.stroke();
      }
      ctx.restore();

      /* Draw bars */
      ctx.save();
      for (index = 0; index < content.data.length; ++index) {
        var fillColorForIndex = null;
        var strokeColorForIndex = null;
        if (content.fillColor != null) {
          if (Array.isArray(content.fillColor)) fillColorForIndex = ctx.fillStyle = content.fillColor[index];
          else ctx.fillStyle = content.fillColor;
        } else ctx.fillStyle = options.fillColorBars;
        if (content.strokeColor != null) {
          if (Array.isArray(content.strokeColor)) strokeColorForIndex = ctx.fillStyle = content.strokeColor[index];
          else ctx.fillStyle = content.strokeColor;
        } else ctx.strokeStyle = options.strokeColorBars;
        var v = content.data[index];
        var vIsArr = Array.isArray(v);
        var renderStartX = leftXPadding + widthPerBar * index;
        if (vIsArr && options.barStyle === 'stacked') {
          var runningValue = 0, lastHeight = 0;
          for (var drawIndex = 0; drawIndex < v.length; ++drawIndex) {
            if (fillColorForIndex != null && Array.isArray(fillColorForIndex)) {
              ctx.fillStyle = fillColorForIndex[drawIndex] || options.fillColorBars;
            }
            if (strokeColorForIndex != null && Array.isArray(strokeColorForIndex)) {
              ctx.strokeStyle = strokeColorForIndex[drawIndex] || options.strokeColorBars;
            }

            runningValue += v[drawIndex];
            var renderBarHeight = Math.floor(remainingHeight * (runningValue / maxChartValue));
            var renderUpToY = topYPadding + remainingHeight - renderBarHeight;
            if (Math.abs(renderBarHeight - lastHeight) < options.stackedBarPadding + 2) {
              lastHeight = renderBarHeight;
              continue;
            }

            var barPadP = drawIndex > 0 ? options.stackedBarPadding : 0;
            var tSX, tSY;
            var tEX, tEY;
            ctx.beginPath();
            ctx.moveTo(tSX = renderStartX + computedBarPadding, tSY = topYPadding + remainingHeight - lastHeight - barPadP);
            ctx.lineTo(renderStartX + computedBarPadding, renderUpToY);
            ctx.lineTo(tEX = renderStartX + (widthPerBar - 1) - computedBarPadding, tEY = renderUpToY);
            ctx.lineTo(renderStartX + (widthPerBar - 1) - computedBarPadding, topYPadding + remainingHeight - lastHeight - barPadP);
            if (drawIndex > 0) ctx.lineTo(tSX, tSY);
            ctx.stroke();
            ctx.fill();
            var hint;
            if (content.hints != null && content.hints[index] != null && (hint = content.hints[index][drawIndex]) != null) {
              this.mouseListeners.push(function(index, drawIndex, hint, sx, sy, ex, ey, x, y) {
                var minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
                var minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
                if (x < minX || x > maxX || y < minY || y > maxY) return null;
                return { index: index, drawIndex: drawIndex, rect: { left: minX, right: maxX, top: minY, bottom: maxY }, text: hint.split('\n') };
              }.bind(this, index, drawIndex, hint, tSX, tSY, tEX, tEY));
            }

            var tagText;
            if (tSY - renderUpToY > options.fontDataTags * 1.25 && content.dataTags != null && (tagText = content.dataTags[index]) !== null && (tagText = tagText[drawIndex]) !== null) {
              var oFS = ctx.fillStyle;
              ctx.fillStyle = 'rgb(0, 0, 0)';
              ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontDataTags, family: options.font });
              ctx.textAlign = 'center';
              ctx.fillText(tagText, renderStartX + widthPerBar / 2, tSY - options.fontDataTags * 0.25);
              ctx.fillStyle = oFS;
            }

            lastHeight = renderBarHeight;
          }

          if (content.barTooltips != null) {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLabels, family: options.font });
            ctx.textAlign = 'center';
            ctx.fillText(content.barTooltips[index] || '', renderStartX + widthPerBar / 2, renderUpToY - 3);
          }
        } else {
          if (vIsArr) v = Helpers.avg(v);
          var renderBarHeight = Math.round(remainingHeight * (v / maxChartValue));
          var renderUpToY = topYPadding + remainingHeight - renderBarHeight;
          ctx.beginPath();
          ctx.moveTo(renderStartX + computedBarPadding, topYPadding + remainingHeight);
          ctx.lineTo(renderStartX + computedBarPadding, renderUpToY);
          ctx.lineTo(renderStartX + (widthPerBar - 1) - computedBarPadding, renderUpToY);
          ctx.lineTo(renderStartX + (widthPerBar - 1) - computedBarPadding, topYPadding + remainingHeight);
          ctx.stroke();
          ctx.fill();

          if (options.barStyle === 'error') {
            var val;
            if ((val = content._data_standard_error[index]) != 0) {
              var renderBarError = Math.round(remainingHeight * (val / maxChartValue));
              ctx.beginPath();
              var wiskerWidth = Math.round((widthPerBar - computedBarPadding * 2) / 8);
              var x = leftXPadding + widthPerBar * index + widthPerBar / 2;
              ctx.moveTo(x - wiskerWidth, renderUpToY + renderBarError);
              ctx.lineTo(x + wiskerWidth, renderUpToY + renderBarError);
              ctx.moveTo(x, renderUpToY + renderBarError);
              ctx.lineTo(x, renderUpToY - renderBarError);
              ctx.moveTo(x - wiskerWidth, renderUpToY - renderBarError);
              ctx.lineTo(x + wiskerWidth, renderUpToY - renderBarError);
              ctx.stroke();
            }
          }

          if (content.barTooltips != null) {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeLabels, family: options.font });
            ctx.textAlign = 'center';
            ctx.fillText(content.barTooltips[index] || '', renderStartX + widthPerBar / 2, renderUpToY - 3);
          }
        }
      }
      ctx.restore();

      if (this.currentHint != null) {
        ctx.save();
        var hRect = this.currentHint.rect, hints = this.currentHint.text;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.font = Helpers.getFont({ weight: options.fontWeight, size: options.fontSizeHint, family: options.font });
        ctx.textAlign = 'left';
        var boxWidth = 0;
        for (var index = 0; index < hints.length; ++index) {
          boxWidth = Math.max(boxWidth, Math.ceil(ctx.measureText(hints[index]).width));
        }
        var boxWidthPadding = 5;
        var lineHeight = options.fontSizeHint * 1.5;
        var boxHeight = hints.length * lineHeight;
        var drawX = hRect.right + 10, drawY = (hRect.top + hRect.bottom) / 2;
        boxWidth += boxWidthPadding * 2;
        if (drawX + boxWidth > width) {
          drawX = hRect.left - boxWidth - 10;
        }
        if (drawY - boxHeight / 2 < 0) {
          drawY = Math.ceil(boxHeight / 2) + 1;
        } else if (drawY + boxHeight / 2 > height) {
          drawY = height - boxHeight / 2 - 1;
        }
        ctx.clearRect(drawX, drawY - boxHeight / 2, boxWidth, boxHeight);
        ctx.rect(drawX, drawY - boxHeight / 2, boxWidth, boxHeight);
        ctx.stroke();
        for (var index = 0; index < hints.length; ++index) {
          ctx.fillText(hints[index], drawX + boxWidthPadding, drawY - boxHeight / 2 + options.fontSizeHint + index * lineHeight);
        }
        ctx.restore();
      }

      ctx.translate(0.5, 0.5);
    };

    return BarChart;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = BarChart;
  } else {
    window.BarChart = BarChart;
  }
})();
