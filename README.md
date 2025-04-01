# konva-label

一个基于Konva.js的图片标注工具库，提供简单易用的API接口，支持图片加载、缩放、标注框绘制和编辑等功能。

[演示地址](https://konva-label-demo.pages.dev/#/preview)

## 功能特性

- 支持图片加载和自适应显示
- 支持画布拖拽和缩放
- 支持矩形标注框的绘制
- 支持标注框的选择、拖动、缩放和旋转
- 支持标注框的删除
- 支持标注框样式自定义（颜色、透明度等）
- 支持标注数据的导入和导出

## 安装

```bash
npm install konva-label
```

## 使用示例

```javascript
import KonvaLabel from 'konva-label';

// 初始化标注实例
const label = new KonvaLabel({
  el: 'container', // 容器ID
  onChange: (data) => {
    console.log('标注数据变化：', data);
  },
  labelConfig: {
    color: '#ff0000', // 标注框颜色
    fillOpacity: 0.3, // 填充透明度
    selectOpacity: 0.5, // 选中时的透明度
    strokeWidth: 1, // 边框宽度
    fontSize: 12, // 文本大小
    textGap: 5, // 文本和标注框的间距
  }
});

// 加载图片
label.loadImage('path/to/image.jpg');

// 开始绘制标注
label.draw({
  label: '标签1',
  color: '#ff0000'
});

// 取消绘制
label.cancelDraw();

// 删除选中的标注
label.deleteSelected();

// 重置缩放
label.resetZoom();
```

## API文档

### 构造函数

```typescript
new KonvaLabel(options: {
  el: string; // 容器ID
  onChange?: (data: { type: string; data: BboxesItem[] }) => void; // 数据变化回调
  labelConfig?: LabelConfig; // 标注配置
})
```

### 实例属性

```typescript
class KonvaLabel {
  stage: Konva.Stage; // 舞台实例，用于管理整个画布
  layer: Konva.Layer; // 图层实例，用于管理所有标注元素
  image: HTMLImageElement | null; // 当前加载的图片元素
  zoomRatio: number; // 图片的缩放比例
  bboxes: BboxesItem[]; // 标注框数组
  labelConfig: LabelConfig; // 标注配置项
}
```

### 配置项

```typescript
interface LabelConfig {
  color?: string; // 标注框颜色
  fillOpacity?: number; // 填充透明度
  selectOpacity?: number; // 选中时的透明度
  strokeWidth?: number; // 边框宽度
  fontSize?: number; // 文本大小
  textGap?: number; // 文本和标注框的间距
}
```

### 方法

#### loadImage(img: HTMLImageElement | string, bboxes?: BboxesItem[]): Promise<string>
加载图片并初始化标注数据

#### draw(labelInfo: LabelInfo): void
开始绘制标注

#### cancelDraw(): void
取消绘制

#### deleteSelected(): void
删除选中的标注

#### deleteById(id: string): void
通过ID删除标注

#### updateLabelName(id: string | number, data: LabelInfo): void
更新标注名称

#### updateSelectOpacity(number: number): void
更新选中标注的透明度

#### updateFillOpacity(number: number): void
更新标注填充透明度

#### resetZoom(): void
重置画布缩放

#### getAllRect(): Array<Konva.Rect>
获取所有标注框

#### getAllText(): Array<Konva.Text>
获取所有文本标签

#### getTransformerNodes(): Array<Konva.Rect>
获取选中的节点

## 许可证

MIT