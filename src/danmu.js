/**
 * 1. 传入宽高，在转屏的时候进行重新计算
 * 2. 数据驱动，因此提供数据变更的时机和方法
 * 3. 计算每条弹幕的样式
 * 4. 提供刷帧的接口
 */

export default class {
  constructor(opts = {}) {
    this.column = opts.column || 4
    this.preFetchSecond = opts.preFetchSecond || 8
    this.width = opts.width || 0
    this.height = opts.height || 0
    this.data = opts.data
    this.danmu = []
    this.lastBeginId = 0
    this.lastEndId = 0
    this.fullscreen = false
    this._setup()
  }

  toggleFullscreen(result) {
    this.fullscreen = result
  }

  /**
   * 把还没获取到 width 的即将渲染的弹幕拿出来，预渲染，然后得到 DOM 属性
   * @param current
   * @returns {Array}
   */
  preRender(current) {
    const result = []
    const { danmu, preFetchSecond } = this
    for (let i = 0; i < danmu.length; i++) {
      const item = danmu[i]
      if (item.beginAt > current + preFetchSecond) {
        break
      }
      if (item.speed === 0 && item.beginAt >= current) {
        result.push(item)
      }
    }
    return result
  }

  /**
   * 给数据追加
   * @param item
   */
  prePatch(item) {
    const { danmu } = this
    for (let i = 0; i < danmu.length; i++) {
      if (danmu[i].id === item.id) {
        this.danmu[i] = item
        break
      }
    }
  }

  flash(current, list) {
    const result = []
    const { danmu, fullscreen } = this
    for (let i = 0; i < danmu.length; i++) {
      const item = danmu[i]
      if (!item.speed) {
        continue
      }
      if (item.beginAt > current) {
        break
      }
      if (fullscreen) {
        if (item.endedAtFullscreen >= current) {
          result.push(item)
        }
      } else {
        if (item.endedAt >= current) {
          result.push(item)
        }
      }
    }
    const length = result.length
    if (!length || (result[0].id === this.lastBeginId && result[length - 1].id === this.lastEndId)) {
      return null
    }
    this.lastBeginId = result[0].id
    this.lastEndId = result[length - 1].id
    if (list.length) {
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
    }
    return this._filterData(result)
  }

  _setup() {
    this._formatData()
  }

  _formatData() {
    if (!this.width || !this.height || !this.data) {
      return
    }
    const result = []
    const dataArr = this.data.split('</source>')[1].split('<d p="')
    dataArr.forEach(item => {
      if (item) {
        const itemArr = item.split('">')
        const meta = itemArr.shift().split(',')
        if (meta[1] === '1') {
          const text = itemArr.join('').split('</d>')[0]
          const beginAt = +meta[0]

          result.push({
            id: meta[7],
            beginAt,
            endedAt: 0,
            endedAtFullscreen: 0,
            stack: -1,
            text,
            width: 0,
            speed: 0,
            left: 0,
            leftAt: 0,
            leftAtFullscreen: 0,
            style: {
              transform: `translateX(100%)`
            }
          })
        }
      }
    })
    this.danmu = result.sort((a, b) => a.beginAt - b.beginAt)
  }

  _filterData(data) {
    const { column } = this
    const result = []
    for (let i = 0; i < column; i++) {
      result.push([])
    }
    data.forEach(item => {
      if (item.stack !== -1) {
        result[item.stack].push(item)
      }
    })
    data.forEach(item => {
      if (item.stack === -1) {
        for (let i = 0; i < column; i++) {
          const stack = result[i]
          if (!stack || stack.length <= 0) {
            result[i].push(item)
            break
          }
          if (this._isValidate(stack[stack.length - 1], item)) {
            result[i].push(item)
            break
          }
        }
      }
    })
    return result
  }

  /**
   * 碰撞检测问题
   * @param prev
   * @param next
   * @returns {boolean}
   * @private
   */
  _isValidate(prev, next) {
    if (prev.width > next.width && prev.rightAt < next.beginAt) {
      return true
    }
    if (this.fullscreen) {
      if (next.leftAtFullscreen > prev.endedAtFullscreen) {
        return true
      }
    } else {
      if (next.leftAt > prev.endedAt) {
        return true
      }
    }
    return false
  }
}
