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

    var r = this.getIntegerValue(contrasted, 0, 2)
    var g = this.getIntegerValue(contrasted, 2, 2)
    var b = this.getIntegerValue(contrasted, 4, 2)
    // https://en.wikipedia.org/wiki/YIQ
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  }

  getIntegerValue(hexcolor, start, end) {
    return parseInt(hexcolor.substr(start, end), 16)
  }

  convert3To6Hex(hexValue) {
    if (hexValue.length === 7) {
      return hexValue
    }

    return `#${hexValue[1]}${hexValue[1]}${hexValue[2]}${hexValue[2]}${hexValue[3]}${hexValue[3]}`
  }
}

export default Color
