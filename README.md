## 基于 konva 实现图像标注

[演示地址](https://konva-label-demo.pages.dev/#/preview)

快速开始

安装：

```bash
npm i konva-label
```

使用：

```js
import KonvaLabel from 'konva-label';
// 1.实例化
let konva = new KonvaLabel({
  el: 'konvaLabel', //节点的id
});
// 2.加载图片
konva.loadImage(img, []); //参数1：图片地址或者是Img实列，参数2：标注框类型是BboxesItem
// 3.销毁
konva.destroy();
```

类型：

```ts
declare namespace Konvalabel {
  export interface LabelInfo {
    label: string; //标签名称
    color?: string; //标签颜色
  }
  export interface BboxesItem {
    id: number;
    score: number;
    className: string;
    box: BoxType;
    classId: number;
    rect: Konva.Rect;
    text: Konva.Text;
  }
  export type BoxType = [number, number, number, number]; //x1 y1 x2 y2
  export interface KonvaConstructor {
    el: string;
    onChange?: OnChange; //回调事件，比如新增，修改，删除会触发
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
```

## 获取所有标注框

```ts
konva.getAllRect();
```

## 获取所有文本

```ts
konva.getAllText();
```

## 获取选中的节点

```ts
konva.getTransformerNodes();
```

## 取消绘制标注框

```ts
konva.cancelDraw();
```

## 绘制标注框

```ts
konva.draw(labelInfo: Konvalabel.LabelInfo)
```

## 删除选中的标注框

```ts
konva.deleteSelected();
```

## 手动选中标注框

```ts
konva.createTransformer(rect: Shape<ShapeConfig> | Stage)
```

## 修改选中透明度

```ts
konva.updateSelectOpacity(number: number)
```

## 修改填充透明度

```ts
konva.updateFillOpacity(number: number)
```

## 修改对应的标注框的 label

```ts
konva.updateLabelName(id: string | number, data: Konvalabel.LabelInfo)
```

## 重置缩放大小和位置

```ts
konva.resetZoom();
```
