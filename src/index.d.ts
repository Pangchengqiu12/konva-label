declare namespace Konvalabel {
  export interface LabelInfo {
    label: string;
    color?: string;
  }
  export interface BboxesItem {
    id: number;
    score: number;
    className: string;
    box: BoxType; //x1 y1 x2 y2
    classId: number;
    rect: Konva.Rect;
    text: Konva.Text;
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
  export type OnChange = (ChangeParams) => void | null;
  export interface ChangeParams {
    type: ChangeType;
    data: BboxesItem[];
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
