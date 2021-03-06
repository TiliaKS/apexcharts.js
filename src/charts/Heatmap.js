import DataLabels from '../modules/DataLabels'
import Animations from '../modules/Animations'
import Graphics from '../modules/Graphics'
import Utils from '../utils/Utils'
import Filters from '../modules/Filters'

/**
 * ApexCharts HeatMap Class.
 * @module HeatMap
 **/

class HeatMap {
  constructor (ctx, xyRatios) {
    this.ctx = ctx
    this.w = ctx.w

    this.xRatio = xyRatios.xRatio
    this.yRatio = xyRatios.yRatio

    this.dynamicAnim = this.w.config.chart.animations.dynamicAnimation

    this.rectRadius = this.w.config.plotOptions.heatmap.radius
    this.strokeWidth = this.w.config.stroke.width
  }

  draw (series) {
    let w = this.w
    const graphics = new Graphics(this.ctx)

    let ret = graphics.group({
      class: 'apexcharts-heatmap'
    })

    ret.attr('clip-path', `url(#gridRectMask${w.globals.cuid})`)

    // width divided into equal parts
    let xDivision = w.globals.gridWidth / w.globals.dataPoints
    let yDivision = w.globals.gridHeight / w.globals.series.length

    let y1 = 0

    for (let i = series.length - 1; i >= 0; i--) {
      // el to which series will be drawn
      let elSeries = graphics.group({
        class: 'apexcharts-series apexcharts-heatmap-series',
        'rel': i + 1,
        'data:realIndex': i
      })

      if (w.config.chart.dropShadow.enabled) {
        const shadow = w.config.chart.dropShadow
        const filters = new Filters(this.ctx)
        filters.dropShadow(elSeries, shadow)
      }

      let x1 = 0

      for (let j = 0; j < series[i].length; j++) {
        let colorShadePercent = 1

        const heatColorProps = this.determineHeatColor(i, j)

        if (w.globals.hasNegs) {
          let shadeIntensity = w.config.plotOptions.heatmap.shadeIntensity
          if (heatColorProps.percent < 0) {
            colorShadePercent = 1 - (1 + (heatColorProps.percent / 100)) * shadeIntensity
          } else {
            colorShadePercent = (1 - (heatColorProps.percent / 100)) * shadeIntensity
          }
        } else {
          colorShadePercent = 1 - (heatColorProps.percent / 100)
        }

        let color = heatColorProps.color

        if (w.config.plotOptions.heatmap.enableShades) {
          let utils = new Utils()
          color = Utils.hexToRgba(
            utils.shadeColor(colorShadePercent, heatColorProps.color),
            w.config.fill.opacity
          )
        }

        let radius = this.rectRadius

        let rect = graphics.drawRect(x1, y1, xDivision, yDivision, radius)
        rect.attr({
          cx: x1,
          cy: y1
        })

        rect.node.classList.add('apexcharts-heatmap-rect')
        elSeries.add(rect)

        rect.attr({
          fill: color,
          i,
          j,
          val: series[i][j],
          'stroke-width': this.strokeWidth,
          stroke: w.globals.stroke.colors[0],
          color: color
        })

        if (w.config.chart.animations.enabled && !w.globals.dataChanged) {
          let speed = 1
          if (!w.globals.resized) {
            speed = w.config.chart.animations.speed
          }
          this.animateHeatMap(rect, x1, y1, xDivision, yDivision, speed)
        }

        if (w.globals.dataChanged) {
          let speed = 1
          if (this.dynamicAnim.enabled) {
            speed = this.dynamicAnim.speed
          }
          let colorFrom = w.globals.previousPaths[i][j].color
          this.animateHeatColor(rect, Utils.rgb2hex(colorFrom), Utils.rgb2hex(color), speed)
        }

        let dataLabels = this.calculateHeatmapDataLabels({
          x: x1,
          y: y1,
          i,
          j,
          series,
          rectHeight: yDivision,
          rectWidth: xDivision
        })
        if (dataLabels !== null) {
          elSeries.add(dataLabels)
        }

        x1 = x1 + xDivision
      }

      y1 = y1 + yDivision

      ret.add(elSeries)
    }

    return ret
  }

  determineHeatColor (i, j) {
    const w = this.w

    const val = w.globals.series[i][j]

    let color = w.globals.colors[i]
    let min = Math.min(...w.globals.series[i])
    let max = Math.max(...w.globals.series[i])
    let total = Math.abs(max) + Math.abs(min)
    let percent = (100 * val) / total

    if (w.config.plotOptions.heatmap.colorScale.ranges.length > 0) {
      const colorRange = w.config.plotOptions.heatmap.colorScale.ranges
      colorRange.map((range, index) => {
        if (val >= range.from && val <= range.to) {
          color = range.color
          min = range.from
          max = range.to
          total = Math.abs(max) + Math.abs(min)
          percent = (100 * val) / total
        }
      })
    }

    return {
      color,
      percent
    }
  }

  calculateHeatmapDataLabels ({
    x,
    y,
    i,
    j,
    series,
    rectHeight,
    rectWidth
  }) {
    let w = this.w
    // let graphics = new Graphics(this.ctx)
    let dataLabelsConfig = w.config.dataLabels

    const graphics = new Graphics(this.ctx)

    let dataLabels = new DataLabels(this.ctx)
    let formatter = dataLabelsConfig.formatter

    let elDataLabelsWrap = null

    if (dataLabelsConfig.enabled) {
      elDataLabelsWrap = graphics.group({
        class: 'apexcharts-data-labels'
      })

      const offX = dataLabelsConfig.offsetX
      const offY = dataLabelsConfig.offsetY

      let dataLabelsX = x + rectWidth / 2 + offX
      let dataLabelsY = y + rectHeight / 2 + parseInt(dataLabelsConfig.style.fontSize) / 3 + offY

      let text = formatter(w.globals.series[i][j], { seriesIndex: i, dataPointIndex: j, globals: w.globals })
      dataLabels.plotDataLabelsText(dataLabelsX, dataLabelsY, text, i, j, elDataLabelsWrap, dataLabelsConfig)
    }

    return elDataLabelsWrap
  }

  animateHeatMap (el, x, y, width, height, speed) {
    const animations = new Animations(this.ctx)
    animations.animateRect(el, {
      x: x + (width / 2), y: y + (height / 2), width: 0, height: 0
    }, {
      x, y, width, height
    }, speed)
  }

  animateHeatColor (el, colorFrom, colorTo, speed) {
    el.attr({ fill: colorFrom }).animate(speed).attr({ fill: colorTo })
  }
}

module.exports = HeatMap
