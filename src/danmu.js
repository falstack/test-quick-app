/**
 * 1. 传入宽高，在转屏的时候进行重新计算
 * 2. 数据驱动，因此提供数据变更的时机和方法
 * 3. 计算每条弹幕的样式
 * 4. 提供刷帧的接口
 */


/**
 * 弹幕不重叠
 * 重要的是追赶的概念
 * 有两个 left
 * 1. 弹幕的发射时间，发射的时候它就出现了，向左滚动
 * 2. 到达屏幕左端的时候的 left，是 minLeft，因为每个弹幕的速度不同，所以只要判断
 * minLeft >= 上一个弹幕的 maxRight？就可以了
 * 即：上一个弹幕完全消失的时间 < 下一个弹幕刚好到达左边的时间，那么他们就在同一个轨道
 * 消失时间 end_time = start_time + duration，到达左边的时间 = end_time - textWidth * speedPerSize
 */
export default class {
  constructor(opts = {}) {
    this.column = opts.column || 4
    this.duration = opts.duration || 8
    this.width = opts.width || 0
    this.height = opts.height || 0
    this.data = opts.data
    this.danmu = []
    this.lastBeginId = 0
    this.lastEndId = 0
    this._setup()
  }

  flash(current, list) {
    const result = []
    const { danmu } = this
    for (let i = 0; i < danmu.length; i++) {
      const item = danmu[i]
      if (item.beginAt > current) {
        break
      }
      if (item.endedAt >= current) {
        result.push(item)
      }
    }
    const length = result.length
    if (!length || (result[0].id === this.lastBeginId && result[length - 1].id === this.lastEndId)) {
      return null
    }
    this.lastBeginId = result[0].id
    this.lastEndId = result[length - 1].id
    result.forEach((newVal, i) => {
      list.forEach((stack, index) => {
        stack.forEach(oldVal => {
          if (newVal.id === oldVal.id) {
            oldVal.stack = index
            result[i] = oldVal
          }
        })
      })
    })
    return this._filterData(result)
  }

  _setup() {
    this._formatData()
  }

  _formatData() {
    if (!this.width || !this.height || !this.data) {
      return
    }
    const { duration, width, height } = this
    const result = []
    const dataArr = this.data.split('</source>')[1].split('<d p="')
    const timePerWidth = duration / width
    const timePerHeight = duration / height
    dataArr.forEach(item => {
      if (item) {
        const itemArr = item.split('">')
        const meta = itemArr.shift().split(',')
        if (meta[1] === '1') {
          const text = itemArr.join('').split('</d>')[0]
          const textLength = this._computeTextLength(text)
          const textWidth = textLength * 35
          const textWidthFullscreen = textLength * 40
          const beginAt = +meta[0]
          const endedAt = beginAt + duration

          result.push({
            beginAt,
            endedAt,
            leftAt: endedAt - timePerWidth * textWidth,
            leftAtFullscreen: endedAt - timePerHeight * textWidthFullscreen,
            speed: (width + textWidth) / duration / 1000 * 16,
            speedFullscreen: (height + textWidthFullscreen) / duration / 1000 * 16,
            mode: meta[1],
            fontSize: meta[2],
            fontColor: meta[3],
            createdAt: +meta[4],
            poll: meta[5],
            userHash: meta[6],
            id: meta[7],
            stack: -1,
            text,
            left: width,
            leftFullscreen: height,
            style: {
              transform: `translateX(${width}px)`
            },
            fullscreenStyle: {
              transform: `translateX(${height}px)`
            }
          })
        }
      }
    })
    this.danmu = result.sort((a, b) => a.beginAt - b.beginAt)
  }

  _filterData(data) {
    const { column } = this
    if (column <= 1) {
      return [data]
    }
    const result = []
    for (let i = 0; i < column; i++) {
      result.push([])
    }
    data.forEach(item => {
      if (item.stack !== -1) {
        result[item.stack].push(item)
      } else {
        for (let i = 0; i < column; i++) {
          const line = result[i]
          if (!line || line.length <= 0) {
            result[i].push(item)
            break
          }
          if (line[line.length -1].endedAt < item.leftAt) {
            result[i].push(item)
            break
          }
        }
      }
    })
    return result
  }

  _computeTextLength(text) {
    return text.replace(/([^\x00-\xff]|[\u4e00-\u9fa5])/igm, 'aa').length
  }
}
