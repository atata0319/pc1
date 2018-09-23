import $ = require('jquery');
//import {EightBitColorPicker, EightBitColorPickerEvent} from 'eight-bit-color-picker';

declare class EightBitColorPickerOptions {
  el: string;
  color?: number;
}

declare class EightBitColorPicker extends HTMLElement {
  static detect(): void;
  constructor(options: EightBitColorPickerOptions);
  getHexColor(): string;
  get8BitColor(): number;
  getRGBColor(): {'r': number, 'g': number, 'b': number};
  getForegroundEscapeSequence(): string;
  getBackgroundEscapeSequence(): string;
  show(): void;
  hide(): void;
  updateColor(color: number): void;
  restoreColor(): void;
}

declare class EightBitColorPickerEventDetail {
  oldColor: string;
  newColor: string;
  picker: EightBitColorPicker;
}

declare class EightBitColorPickerEvent extends Event {
  detail: EightBitColorPickerEventDetail;
}

class Point {
  public x: number;
  public y: number;

  public constructor(x, y) {
      this.x = x;
      this.y = y;
  }

  public equals(other: Point): boolean {
      return this.x === other.x && this.y === other.y;
  }
}

class StrokeData {
  public targetLayerId: number;
  public lineWidth: number;
  public lineColor: string;
  public pt1: Point;
  public pt2: Point;

  constructor(tl: HTMLCanvasElement, lw: number, lc: string, x1: number, y1: number, x2: number, y2: number) {
    this.targetLayerId = parseInt(tl.id.substring(LAYERID_PREFIX.length));
    this.lineWidth = lw;
    this.lineColor = lc;
    this.pt1 = new Point(x1, y1);
    this.pt2 = new Point(x2, y2);
  }
}

class LayerInfo {
  public id: number;
  public layer: HTMLCanvasElement;
}

const LOCALSTORAGE_KEY_SETTINGS = 'settings2';
const LOCALSTORAGE_KEY_STROKES = 'strokes2';
const LOCALSTORAGE_KEY_SETTINGS_OLD = 'settings';
const LOCALSTORAGE_KEY_STROKES_OLD = 'strokes';
const LAYERID_PREFIX = 'pclyr';
const layers = new Array<HTMLCanvasElement>();
let picker: EightBitColorPicker = null;
let lineWidth = 1;
let lineCount = 0;
let layerId = 1;
let targetLayer: HTMLCanvasElement = null;
let prevX = null;
let prevY = null;
let strokes: Array<StrokeData>;
let undoBuffer: Array<StrokeData>;

$(function(){

  picker = new EightBitColorPicker({ el: 'ebcp', color: 0 });
  picker.addEventListener('colorChange', function(e: EightBitColorPickerEvent) {
    console.log('Old Color: ' + e.detail.oldColor)
    console.log('New Color: ' + e.detail.newColor)
    console.log('8bit Color: ' + e.detail.picker.get8BitColor())
    console.log('Hex Color: ' + e.detail.picker.getHexColor())
    saveSettings();
    setTimeout(() => {
      e.detail.picker.hide();
    }, 50);
  });

  $('#lineWidth1').on('click', () => {
    $('#lineWidth3').css('border', '');
    $('#lineWidth7').css('border', '');
    $('#lineWidth15').css('border', '');
    $('#lineWidth1').css('border', 'solid 1px black');
    lineWidth = 1;
    saveSettings();
  });

  $('#lineWidth3').on('click', () => {
    $('#lineWidth1').css('border', '');
    $('#lineWidth7').css('border', '');
    $('#lineWidth15').css('border', '');
    $('#lineWidth3').css('border', 'solid 1px black');
    lineWidth = 3;
    saveSettings();
  });

  $('#lineWidth7').on('click', () => {
    $('#lineWidth1').css('border', '');
    $('#lineWidth3').css('border', '');
    $('#lineWidth15').css('border', '');
    $('#lineWidth7').css('border', 'solid 1px black');
    lineWidth = 7;
    saveSettings();
  });

  $('#lineWidth15').on('click', () => {
    $('#lineWidth1').css('border', '');
    $('#lineWidth3').css('border', '');
    $('#lineWidth7').css('border', '');
    $('#lineWidth15').css('border', 'solid 1px black');
    lineWidth = 15;
    saveSettings();
  });

  $('#pclyrs_add').on('click', () => {
    const layer = document.createElement('canvas');
    layer.id = 'pclyr' + layerId;
    // <!--      <canvas id="layer1" width="480" height="360" style="position: absolute; left: 0px; top: 0px; background-color: transparent; z-index:3;"></canvas>-->
    $('#pclyrs').append(layer);
    const row = $('#pclyrs_mng').insertRow(1);
    const cellLayer = row.insertCell(-1);
    cellLayer.innerHTML = '<input id="' + LAYERID_PREFIX + layerId + 's" type="radio" name="pclyrs_s" /><label for="' + LAYERID_PREFIX + layerId + 's">' + layerId.toString() + "</label>";
    const cellVisibility = row.insertCell(-1);
    cellVisibility.align = 'center';
    cellVisibility.innerHTML = '<input type="checkbox" id="' + LAYERID_PREFIX + layerId + 'v" checked="checked" />';
    const cellUp = row.insertCell(-1);
    cellUp.innerHTML = '<button>↑</button>';
    const cellDown = row.insertCell(-1);
    cellDown.innerHTML = '<button>↓</button>';
    const cellTransparency = row.insertCell(-1);
    cellTransparency.innerHTML = '<input type="number" id="' + LAYERID_PREFIX + layerId + 'o" min="0" max="100" value="0" />';
    layerId++;
  });

  $('#sizel').on('click', () => {
    $('#pclyrs').style.width = '640px';
    $('#pclyrs').style.height = '480px';
    redrawCanvas();
  });

  $('#sizem').on('click', () => {
    $('#pclyrs').style.width = '480px';
    $('#pclyrs').style.height = '360px';
    redrawCanvas();
  });

  $('#sizes').on('click', () => {
    $('#pclyrs').style.width = '320px';
    $('#pclyrs').style.height = '240px';
    redrawCanvas();
  });

  $('#undo').on('click', () => {
    undoBuffer.push(new StrokeData(null, 0, null, null, null, null, null));
    for (let sd = strokes.pop(); sd.lineWidth !== 0; sd = strokes.pop()) {
      clearCanvas(
          getLayerFromId(sd.targetLayerId),
          Math.min(sd.pt1.x, sd.pt2.x) - sd.lineWidth - 1,
          Math.min(sd.pt1.y, sd.pt2.y) - sd.lineWidth - 1,
          Math.abs(sd.pt1.x - sd.pt2.x) + (sd.lineWidth + 1) * 2,
          Math.abs(sd.pt1.y - sd.pt2.y) + (sd.lineWidth + 1) * 2);
      undoBuffer.push(sd);
    }
    redrawCanvas();
    saveStorage(LOCALSTORAGE_KEY_STROKES, strokes);
  });

  $('#redo').on('click', () => {
    strokes.push(new StrokeData(null, 0, null, null, null, null, null));
    for (let sd = undoBuffer.pop(); sd.lineWidth !== 0; sd = undoBuffer.pop()) {
      clearCanvas(
          getLayerFromId(sd.targetLayerId),
          Math.min(sd.pt1.x, sd.pt2.x) - sd.lineWidth - 1,
          Math.min(sd.pt1.y, sd.pt2.y) - sd.lineWidth - 1,
          Math.abs(sd.pt1.x - sd.pt2.x) + (sd.lineWidth + 1) * 2,
          Math.abs(sd.pt1.y - sd.pt2.y) + (sd.lineWidth + 1) * 2);
      strokes.push(sd);
    }
    redrawCanvas();
    saveStorage(LOCALSTORAGE_KEY_STROKES, strokes);
  });

  $('#erase').on('click', () => {
    strokes.length = 0;
    undoBuffer.length = 0;
    clearAllCanvas();
    saveStorage(LOCALSTORAGE_KEY_STROKES, strokes);
  });

  $('#pclyrs').on('mousedown', (e) => {
    const rect = e.target.getBoundingClientRect();
    targetLayer = getSelectedLayer();
    if (targetLayer == null) {
      alert('描画対象のレイヤーが選択されていません。');
      return;
    }
    prevX = e.clientX - rect.left;
    prevY = e.clientY - rect.top;
    lineCount = 0;
    undoBuffer.length = 0;
    strokes.push(new StrokeData(null, 0, null, null, null, null, null));
  });

  $('#pclyrs').on('mousemove', (e) => {
    if (targetLayer == null) {
      return;
    }
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (prevX === x && prevY === y) {
      // 同じ地点の場合、何もしない。
    } else {
      drawLine(targetLayer, lineWidth, picker.getHexColor(), prevX, prevY, x, y);
      strokes.push(new StrokeData(targetLayer, lineWidth, picker.getHexColor(), prevX, prevY, x, y));
      lineCount++;
    }
    prevX = x;
    prevY = y;
  });

  $('#pclyrs').on('mouseup', (e) => {
    if (targetLayer == null) {
      return;
    }
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (prevX === x && prevY === y) {
      if (lineCount === 0) {
        drawPoint(targetLayer, lineWidth, picker.getHexColor(), x, y);
        strokes.push(new StrokeData(targetLayer, lineWidth, picker.getHexColor(), x, y, x, y));
      }
    } else {
      drawLine(targetLayer, lineWidth, picker.getHexColor(), prevX, prevY, x, y);
      strokes.push(new StrokeData(targetLayer, lineWidth, picker.getHexColor(), prevX, prevY, x, y));
      lineCount++;
    }
    targetLayer = null;
    prevX = null;
    prevY = null;
    saveStorage(LOCALSTORAGE_KEY_STROKES, strokes);
  });

  $('#pclyrs').on('mouseleave', (e) => {
    prevX = null;
    prevY = null;
  });

  const settings = loadSettings();
  if (settings != null) {
    if (settings.lw != null) {
      switch (settings.lw) {
        case 1:
          $('#lineWidth1').click();
          break;
        case 3:
          $('#lineWidth3').click();
          break;
        case 7:
          $('#lineWidth7').click();
          break;
        case 15:
          $('#lineWidth15').click();
          break;
      }
    }
    if (settings.lc != null) {
      picker.updateColor(settings.lc);
    }
  }

  localStorage.removeItem(LOCALSTORAGE_KEY_SETTINGS_OLD);
  localStorage.removeItem(LOCALSTORAGE_KEY_STROKES_OLD);
/*
  strokes = loadStorage(LOCALSTORAGE_KEY_STROKES);
  if (strokes) {
    for (let i = 0; i < strokes.length; i++) {
      strokes[i].pt1.equals = Point.prototype.equals;
      strokes[i].pt2.equals = Point.prototype.equals;
    }
  } else {
    strokes = new Array();
  }
  undoBuffer = new Array();
  redrawCanvas();
*/
  if (layers.length === 0) {
    $('#pclyrs_add').click();
  }

});

function getSelectedLayer(): HTMLCanvasElement {
  return null;
}

function getLayerFromId(layerId: number): HTMLCanvasElement {
  return $('#' + LAYERID_PREFIX + layerId);
}

function drawPoint(targetLayer: HTMLCanvasElement, lw: number, lc: string, x: number, y: number) {
  //console.log(lw, lc, x1, y1);
  const ctx = targetLayer.getContext('2d');
  ctx.fillStyle = lc;
  ctx.beginPath();
  ctx.arc(x, y, lw / 2, 0, 2 * Math.PI, false);
  ctx.fill();
}

function drawLine(targetLayer: HTMLCanvasElement, lw: number, lc: string, x1: number, y1: number, x2: number, y2: number) {
  //console.log(lw, lc, x1, y1, x2, y2);
  const ctx = targetLayer.getContext('2d');
  ctx.lineWidth = lw;
  ctx.strokeStyle = lc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function clearCanvas(targetLayer: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const ctx = targetLayer.getContext('2d');
  if (x != null && w != null) {
    ctx.clearRect(x, y, w, h);
  } else {
    ctx.clearRect(0, 0, targetLayer.width, targetLayer.height);
  }
}

function clearAllCanvas() {

}

function redrawCanvas() {
  for (let i = 0; i < strokes.length; i++) {
    if (strokes[i].lineWidth === 0) {
      continue;
    }
    if (strokes[i].pt1.equals(strokes[i].pt2)) {
      drawPoint(
          getLayerFromId(strokes[i].targetLayerId),
          strokes[i].lineWidth,
          strokes[i].lineColor,
          strokes[i].pt1.x,
          strokes[i].pt1.y);
    } else {
      drawLine(
          getLayerFromId(strokes[i].targetLayerId),
          strokes[i].lineWidth,
          strokes[i].lineColor,
          strokes[i].pt1.x,
          strokes[i].pt1.y,
          strokes[i].pt2.x,
          strokes[i].pt2.y);
    }
  }
}

function saveSettings() {
  saveStorage(LOCALSTORAGE_KEY_SETTINGS, { 'lw': lineWidth, 'lc': picker.get8BitColor() });
}

function loadSettings() {
  return loadStorage(LOCALSTORAGE_KEY_SETTINGS);
}

function saveStorage(key, val) {
  const str = JSON.stringify(val);
  // console.log(str);
  localStorage.setItem(key, str);
}

function loadStorage(key) {
  const obj = localStorage.getItem(key);
  //console.log(obj);
  return JSON.parse(obj);
}
