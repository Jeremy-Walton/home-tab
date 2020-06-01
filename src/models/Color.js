class Color {
  constructor(value) {
    this.value = value
  }

  toHex() {
    if (this.value === undefined || this.value.indexOf('#') !== 0) { return '#d5dce2' }

    return this.convert3To6Hex(this.value)
  }

  contrast() {
    const contrasted = this.toHex().slice(1)

    const r = this.invertValue(contrasted.slice(0, 2))
    const g = this.invertValue(contrasted.slice(2, 4))
    const b = this.invertValue(contrasted.slice(4, 6))

    return `#${r}${g}${b}`
  }

  invertValue(value) {
    return this.padZero((255 - parseInt(value, 16)).toString(16))
  }

  padZero(str, len) {
    len = len || 2
    var zeros = new Array(len).join('0')
    return (zeros + str).slice(-len)
  }

  convert3To6Hex(hexValue) {
    if (hexValue.length === 7) {
      return hexValue
    }

    return `#${hexValue[1]}${hexValue[1]}${hexValue[2]}${hexValue[2]}${hexValue[3]}${hexValue[3]}`
  }
}

export default Color
