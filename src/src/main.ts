import $ = require('jquery');
import {Point} from './point';
import {Size} from './size';
import {Rectangle} from './rectangle';

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

class StrokeData {
  public targetLayerId: number;
  public lineWidth: number;
  public lineColor: string;
  public pt1: Point;
  public pt2: Point;

  constructor(tl: HTMLCanvasElement, lw: number, lc: string, x1: number, y1: number, x2: number, y2: number) {
    this.targetLayerId = tl != null ? parseInt(tl.id.substring(LAYERID_PREFIX.length)) : null;
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
let lineWidth: number = 1;
let lineCount: number = 0;
let layerId: number = 1;
let targetLayer: HTMLCanvasElement = null;
let prevX: number = null;
let prevY: number = null;
let strokes = new Array<StrokeData>();
let undoBuffer = new Array<StrokeData>();

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

  document.onselectstart = function () {
    return false;
  };

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
    layer.id = LAYERID_PREFIX + layerId;
    const sz = getLayerSize();
    layer.width = sz.width;
    layer.height = sz.height;
    layer.style.position = 'absolute';
    layer.style.left = '0px';
    layer.style.top = '0px';
    layer.style.zIndex = layerId.toString();
    $('#pclyrs').append(layer);
    layers.push(layer);
    const row = $('tbody tr:first').after(
      `<tr>
      <td style="border: solid 1px black;"><input id="${LAYERID_PREFIX + layerId}s" type="radio" name="pclyrs_s" value="${LAYERID_PREFIX + layerId}" /><label for="${LAYERID_PREFIX + layerId}s">${layerId}</label></td>
      <td style="text-align: center; border: solid 1px black;"><input type="checkbox" id="${LAYERID_PREFIX + layerId}v" checked="checked" /></td>
      <td style="text-align: center; border: solid 1px black;"><button>↑</button></td>
      <td style="text-align: center; border: solid 1px black;"><button>↓</button></td>
      <td style="border: solid 1px black;"><input type="number" id="${LAYERID_PREFIX + layerId}o" min="0" max="100" value="0" /></td>
      </tr>`);
    $('#' + LAYERID_PREFIX + layerId + 'v').on('change', (e: $.Event) => {
      const layerId = parseInt(e.target.id.substring(LAYERID_PREFIX.length));
      if (e.target.checked) {
        getLayerFromId(layerId).style.visibility = 'visible';
      } else {
        getLayerFromId(layerId).style.visibility = 'hidden';
      }
    });
    $('#' + LAYERID_PREFIX + layerId + 'o').on('change', (e: $.Event) => {
      const layerId = parseInt(e.target.id.substring(LAYERID_PREFIX.length));
      if (e.target.value < 0)
        getLayerFromId(layerId).style.opacity = '1';
      else if (e.target.value < 100)
        getLayerFromId(layerId).style.opacity = ((100 - e.target.value) / 100).toString();
      else
        getLayerFromId(layerId).style.opacity = '0';
    });
    layerId++;
  });

  $('#sizel').on('click', () => {
    $('#pclyrs').css('width', '640px');
    $('#pclyrs').css('height', '480px');
    for (const layer of layers) {
      layer.width = 640;
      layer.height = 480;
    }
    redrawCanvas();
  });

  $('#sizem').on('click', () => {
    $('#pclyrs').css('width', '480px');
    $('#pclyrs').css('height', '360px');
    for (const layer of layers) {
      layer.width = 480;
      layer.height = 360;
    }
    redrawCanvas();
  });

  $('#sizes').on('click', () => {
    $('#pclyrs').css('width', '320px');
    $('#pclyrs').css('height', '240px');
    for (const layer of layers) {
      layer.width = 320;
      layer.height = 240;
    }
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

  $('#pclyrs').on('mousedown', (e: MouseEvent) => {
    // console.log('mousedown', e);
    targetLayer = getSelectedLayer();
    if (targetLayer == null) {
      alert('描画対象のレイヤーが選択されていません。');
      return;
    }
    prevX = e.offsetX;
    prevY = e.offsetY;
    lineCount = 0;
    undoBuffer.length = 0;
    strokes.push(new StrokeData(null, 0, null, null, null, null, null));
  });

  $('#pclyrs').on('mousemove', (e: MouseEvent) => {
    if (targetLayer == null) {
      return;
    }
    // console.log('mousemove', e);
    const x = e.offsetX;
    const y = e.offsetY;
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

  $('#pclyrs').on('mouseup', (e: MouseEvent) => {
    // console.log('mouseup', e);
    if (targetLayer == null) {
      return;
    }
    const x = e.offsetX;
    const y = e.offsetY
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

  $('#pclyrs').on('touchstart', (e: PointerEvent) => {
    // console.log('touchstart', e);
  });

  $('#pclyrs').on('touchmove', (e: PointerEvent) => {
    // console.log('touchmove', e);
  });

  $('#pclyrs').on('touchend', (e: PointerEvent) => {
    // console.log('touchend', e);
  });

  $('#pclyrs').on('touchcancel', (e: PointerEvent) => {
    // console.log('touchcancel', e);
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
    layerId = 1;
    $('#pclyrs_add').click();
    $('#' + LAYERID_PREFIX + 1 + 's').prop('checked', true);
  }

});

function getSelectedLayer(): HTMLCanvasElement {
  return $('#' + $('input[name=pclyrs_s]:checked').val()).get(0);
}

function getLayerFromId(layerId: number): HTMLCanvasElement {
  return $('#' + LAYERID_PREFIX + layerId).get(0);
}

function getLayerSize(): Size {
  return new Size(parseInt($('#pclyrs').css('width')), parseInt($('#pclyrs').css('height')));
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
  for (const layer of layers) {
    clearCanvas(layer, null, null, null, null);
  }
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

