import Konva from 'konva';
declare namespace Konvalabel {
  export interface LabelInfo {
    label?: string;
    color?: string;
    [key: string]: any;
  }
  export interface BboxesItem {
    id?: number | string;
    label: string;
    box: BoxType; //x1 y1 x2 y2
    [key: string]: any;
  }
  export type BoxType = [number, number, number, number];
  export interface KonvaConstructor {
    el: string;
    onChange?: OnChange;
    labelConfig?: LabelConfig;
  }
  export interface LabelConfig {
    color?: string;
    fillOpacity?: number; //填充透明度
    selectOpacity?: number; //选中时的透明度
    strokeWidth?: number;
    fontSize?: number;
    textGap?: number; //文本和标注框的间距
  }
  export interface EmitData {
    id: number | string;
    label: string;
    box: BoxType; //x1 y1 x2 y2
    rect: Konva.Rect;
    text: Konva.Text;
    [key: string]: any;
  }
  export type OnChange = (ChangeParams) => void | null;
  export interface ChangeParams {
    type: ChangeType;
    data: EmitData[];
  }
  export type ChangeType = 'update' | 'add' | 'delete' | 'init';

  export interface XYWH {
    width: number;
    height: number;
    x: number;
    y: number;
  }
}
export default Konvalabel;
