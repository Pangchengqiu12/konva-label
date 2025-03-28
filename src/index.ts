import Konva from 'konva';
import { debounce } from './utils';
import Konvalabel from './types';
import {
  imageOnLoad,
  getRelativePointerPosition,
  getStageAbsoluteDimensions,
  getBoundingBoxAfterChanges,
  fitBBoxToScaledStage,
  toRgba,
} from './utils';
import type { KonvaEventObject } from 'konva/lib/Node';
import { LABEL_CONFIG } from './contant';
import type { Shape, ShapeConfig } from 'konva/lib/Shape';
import type { Stage } from 'konva/lib/Stage';

export default class KonvaLabel {
  public stage: Konva.Stage; //舞台
  public layer: Konva.Layer; //图层
  public stageContainer: string; //舞台（节点）的id
  public image: HTMLImageElement | null = null; //图片的原始信息
  public zoomRatio: number = 1; //图片的缩放比例
  public imageNode: Konva.Image | null = null; //图片在画画布上的实列
  public bboxes: Konvalabel.BboxesItem[] = []; //标注框
  public labelConfig: Konvalabel.LabelConfig = LABEL_CONFIG; //标注框的配置

  private currentShape: Konva.Rect | null = null; //当前绘制的标注框
  private labelInfo: Konvalabel.LabelInfo = {}; //新绘制标签的名称
  private transformer: Konva.Transformer | null = null; //标注框变形
  private onChange: Konvalabel.OnChange | null = null;

  constructor({ el, onChange, labelConfig }: Konvalabel.KonvaConstructor) {
    this.stageContainer = el;
    const container = this.getStageContainerNode();
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    this.stage = new Konva.Stage({
      container: container,
      width: container.clientWidth,
      height: container.clientHeight,
      draggable: true,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    if (onChange) this.onChange = onChange;
    if (labelConfig)
      this.labelConfig = Object.assign(this.labelConfig, labelConfig);
    this.bindEvents();
  }
  //绑定事件
  private bindEvents() {
    //mousedown  mouseup moveuchmove  三个事件用来实现绘制标注框的功能
    this.stage.on('mousedown', this.mousedown);
    this.stage.on('mousemove', this.mousemove);
    this.stage.on('mouseup', this.mouseup);
    this.stage.on('dragmove', this.dragmove); //舞台拖拽
    this.stage.on('wheel', this.wheel); //舞台缩放事件
    //画布点击事件
    this.stage.on('click tap', (e) => {
      this.createTransformer(e.target); // 只有在移动工具下点击选中标记框
    });

    window.addEventListener('resize', this.fitStageToContainer);
  }
  /**
   * 限制画布活动范围不超过图片
   */
  private dragmove = () => {
    if (!this.imageNode) return;
    const imageWidth = this.imageNode.width();
    const imageHeight = this.imageNode.height();
    const stagePos = this.stage.position();
    const stageSize = this.stage.size();
    const scale = this.stage.scaleX(); // 假设 x 和 y 的缩放比例相同

    // 计算放大后的画布大小
    const scaledWidth = stageSize.width * scale;
    const scaledHeight = stageSize.height * scale;

    // 确保画布的左边和上边不超过图片的左边和上边
    const newX = Math.min(0, Math.max(stagePos.x, imageWidth - scaledWidth));
    const newY = Math.min(0, Math.max(stagePos.y, imageHeight - scaledHeight));

    // 更新舞台位置
    this.stage.position({ x: newX, y: newY });
    this.stage.batchDraw();
  };
  /**
   * 鼠标滚轮事件，控制舞台缩放
   */
  private wheel = (e: KonvaEventObject<WheelEvent>) => {
    if (this.currentShape) return;
    e.evt.preventDefault(); //阻止默认滚轮行为
    const oldScale = this.stage.scaleX(); //获取舞台当前的缩放比例
    const pointer = this.stage.getPointerPosition(); //获取鼠标指针的位置
    //计算鼠标指针在舞台中的位置
    const mousePointTo = {
      x: (pointer!.x - this.stage.x()) / oldScale,
      y: (pointer!.y - this.stage.y()) / oldScale,
    };
    const isZoomingOut = e.evt.deltaY > 0; //获取鼠标滚轮的方向
    // 限制最大和最小缩放比例
    const MAX_SCALE = 5;
    const MIN_SCALE = 1;
    const newScale = isZoomingOut
      ? Math.max(oldScale * 0.9, MIN_SCALE)
      : Math.min(oldScale * 1.1, MAX_SCALE); //计算新的缩放比例
    this.stage.scale({ x: newScale, y: newScale }); //缩放舞台

    // 计算缩放后的舞台尺寸
    const scaledWidth = this.stage.width() * newScale;
    const scaledHeight = this.stage.height() * newScale;

    // 计算新的位置，确保舞台不会超出视野
    const newPos = {
      x: Math.max(
        Math.min(0, pointer!.x - mousePointTo.x * newScale),
        this.stage.width() - scaledWidth
      ),
      y: Math.max(
        Math.min(0, pointer!.y - mousePointTo.y * newScale),
        this.stage.height() - scaledHeight
      ),
    };

    this.stage.position(newPos);
    this.stage.batchDraw();
  };
  // 获取舞台的节点
  private getStageContainerNode() {
    return document.getElementById(this.stageContainer) as HTMLDivElement;
  }
  /**
   * 清除layer图层中的所有元素，并还原舞台的缩放和位置
   */
  private destroyChildren() {
    if (!this.layer) return;
    this.layer.destroyChildren(); //清除layer图层标注框
    this.image = null;
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
  }
  // 加载图片

  // 调整舞台大小
  private fitStageToContainer = debounce(() => {
    const zoomRatio = this.getZoomRatio();
    const containerHeight = this.image!.height * zoomRatio;
    const scaledWidth = this.image!.width * zoomRatio;
    this.stage.width(scaledWidth);
    this.stage.height(containerHeight);
    if (this.imageNode) {
      // 设置舞台宽度为新的图片宽度
      this.imageNode.size({
        width: scaledWidth,
        height: containerHeight,
      });
      // 不需要居中，x坐标始终为0
      this.imageNode.x(0);
      this.imageNode.y(0);
    }
    this.updateLable();
    this.layer.draw();
  }, 200);

  private createLabel({
    id = Date.now().toString(),
    x,
    y,
    width,
    height,
    labelInfo = this.labelInfo,
  }) {
    const fill = toRgba(
      (labelInfo.color || this.labelConfig.color) as string,
      this.labelConfig.fillOpacity
    );
    const stroke = labelInfo.color || this.labelConfig.color;
    const rect = new Konva.Rect({
      id,
      x: x,
      y: y,
      width: width,
      height: height,
      name: 'rect',
      fill: fill,
      stroke: stroke,
      strokeWidth: 1,
      draggable: false,
      strokeScaleEnabled: false, //防止transformer缩放时,矩形边框被拉伸
      data: {
        ...labelInfo,
        id,
      },
    });
    const text = new Konva.Text({
      id,
      x,
      y: y - this.labelConfig.textGap! - this.labelConfig.fontSize!,
      fontSize: this.labelConfig.fontSize!,
      text: labelInfo.label || '',
      fill: stroke,
    });
    this.layer.add(text);
    this.layer.add(rect);
    this.dragBoundFunc(rect);
    return rect;
  }

  /**
   * 更新所有标注框和标签的尺寸和位置(窗口尺寸发生变化时调用)
   */
  private updateLable() {
    if (!this.image || !this.bboxes.length) return;
    const rectangles = this.getAllRect();
    // 更新所有文本标签
    const texts = this.getAllText();
    this.bboxes.forEach((item, index) => {
      rectangles[index]?.x(item.box[0] * this.zoomRatio);
      rectangles[index]?.y(item.box[1] * this.zoomRatio);
      rectangles[index]?.width((item.box[2] - item.box[0]) * this.zoomRatio);
      rectangles[index]?.height((item.box[3] - item.box[1]) * this.zoomRatio);
      texts[index]?.x(item.box[0] * this.zoomRatio);
      texts[index]?.y(
        item.box[1] * this.zoomRatio -
          this.labelConfig.textGap! -
          this.labelConfig.fontSize!
      );
    });
  }
  /**
   * 鼠标左键按下事件(开始绘制)
   */
  private mousedown = () => {
    if (this.stage.draggable()) return;
    if (this.currentShape) return this.mouseup();

    const pos = getRelativePointerPosition(this.layer);
    this.currentShape = this.createLabel({
      id: Date.now().toString(),
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };
  /**
   * 鼠标移动事件(绘制中)
   */
  private mousemove = () => {
    if (!this.currentShape) return;
    const pos = getRelativePointerPosition(this.layer);
    // 计算新的宽度和高度
    let width = pos.x - this.currentShape.x();
    let height = pos.y - this.currentShape.y();

    // 确保矩形不会超出画布
    const stageSize = this.stage.size();
    if (width > 0) {
      // 向右绘制时，确保右边界不超出画布
      const maxRightX = stageSize.width - this.currentShape.x();
      width = Math.min(width, maxRightX);
    } else {
      // 向左绘制时，确保不超出左边界
      width = Math.max(width, -this.currentShape.x());
    }

    if (height > 0) {
      // 向下绘制时，确保下边界不超出画布
      const maxBottomY = stageSize.height - this.currentShape.y();
      height = Math.min(height, maxBottomY);
    } else {
      // 向上绘制时，确保不超出上边界
      height = Math.max(height, -this.currentShape.y());
    }
    this.currentShape.height(height);
    this.currentShape.width(width);
    this.layer.batchDraw();
  };

  /**
   * 鼠标左键抬起(绘制结束)
   */
  private mouseup = () => {
    if (!this.currentShape) return;
    // 获取舞台大小
    const stageSize = this.stage.size();

    // 计算最终的位置和大小
    let finalX = this.currentShape.x();
    let finalY = this.currentShape.y();
    let width = this.currentShape.width();
    let height = this.currentShape.height();

    // 处理负宽度/高度的情况
    if (width < 0) {
      finalX += width;
      width = Math.abs(width);
    }
    if (height < 0) {
      finalY += height;
      height = Math.abs(height);
    }

    // 确保标注框完全在画布内
    if (finalX + width > stageSize.width) {
      width = stageSize.width - finalX;
    }
    if (finalY + height > stageSize.height) {
      height = stageSize.height - finalY;
    }

    // 如果标注框太小，就删除它
    if (width < 5 || height < 5) {
      this.currentShape.destroy();
    } else {
      // 设置最终的位置和大小
      this.currentShape.position({
        x: Math.max(0, finalX),
        y: Math.max(0, finalY),
      });
      this.currentShape.size({
        width: width,
        height: height,
      });

      // 为新创建的矩形添加拖动约束

      this.updateText(this.currentShape);
      this.emitChange('add'); // 触发添加事件
    }
    this.cancelDraw();
    this.layer.draw();
  };
  /**
   * 限制选中标注框的活动范围不超过图片
   * @param {Konva.Rect} rect konva.Rect实列
   */
  private dragBoundFunc(rect: Konva.Rect) {
    rect.dragBoundFunc((pos) => {
      const stageSize = this.stage.size();
      const stageScale = this.stage.scaleX();

      // 计算出矩形实际的宽高
      const rectWidth = rect.width() * rect.scaleX() * stageScale;
      const rectHeight = rect.height() * rect.scaleY() * stageScale;

      // 计算舞台的边界考虑了缩放
      const stageLeft = this.stage.x();
      const stageTop = this.stage.y();
      const stageRight = stageLeft + stageSize.width * stageScale;
      const stageBottom = stageTop + stageSize.height * stageScale;

      // 调整矩形的位置以防止超出舞台边界
      const newX = Math.max(stageLeft, Math.min(pos.x, stageRight - rectWidth));
      const newY = Math.max(
        stageTop,
        Math.min(pos.y, stageBottom - rectHeight)
      );

      this.updateText(rect);
      return {
        x: newX,
        y: newY,
      };
    });
  }

  /**
   * 限制标注框的变换范围不超过图片
   */
  private constrainSizes = (oldBox, newBox) => {
    if (!this.transformer) return;
    // it's important to compare against `undefined` because it can be missed (not rotated box?)
    const rotation =
      newBox.rotation !== undefined ? newBox.rotation : oldBox.rotation;
    const isRotated = rotation !== oldBox.rotation;
    const stageDimensions = getStageAbsoluteDimensions(this.stage);

    if (newBox.width < 3) newBox.width = 3;
    if (newBox.height < 3) newBox.height = 3;

    // // it's harder to fix sizes for rotated box, so just block changes out of stage
    if (rotation || isRotated) {
      const { x, y, width, height } = newBox;
      const selfRect = { x: 0, y: 0, width, height };

      // bounding box, got by applying current shift and rotation to normalized box
      const clientRect = getBoundingBoxAfterChanges(
        selfRect,
        { x, y },
        rotation
      );
      const fixed = fitBBoxToScaledStage(clientRect, stageDimensions);

      // if bounding box is out of stage — do nothing
      if (
        ['x', 'y', 'width', 'height'].some(
          (key) => Math.abs(fixed[key] - clientRect[key]) > 0.001
        )
      )
        return oldBox;
      return newBox;
    }
    this.updateText(this.transformer.nodes()[0] as Konva.Rect);

    return fitBBoxToScaledStage(newBox, stageDimensions);
  };
  /**
   * 更新标注框标签的位置
   * @param {Konva.Rect} rect konva.Rect的实列
   */
  private updateText = debounce((rect: Konva.Rect) => {
    const textList = this.getAllText();
    const find = textList.find((i) => i.id() === rect.id());
    find?.setAttrs({
      x: rect.x(),
      y: rect.y() - this.labelConfig.textGap! - this.labelConfig.fontSize!,
      text: rect.attrs.data.label,
    });
  }, 200);
  private emitChange(type: Konvalabel.ChangeType) {
    const rects = this.getAllRect();
    const textList = this.getAllText();
    this.bboxes = rects.map((item, index) => {
      const obj: Konvalabel.EmitData = { ...item.attrs.data };
      const x = item.x() / this.zoomRatio;
      const y = item.y() / this.zoomRatio;

      const width = (item.width() * item.scaleX()) / this.zoomRatio;
      const height = (item.height() * item.scaleY()) / this.zoomRatio;
      const box: Konvalabel.BoxType = [Math.round(x), Math.round(y), Math.round(x + width), Math.round(y + height)];
      obj.box = box;
      obj.rect = rects[index];
      obj.text = textList[index];
      return obj;
    });
    this.onChange &&
      this.onChange({
        type,
        data: this.bboxes,
      });
  }
  /**
   * # 获取缩放比
   */
  public getZoomRatio() {
    const container = this.getStageContainerNode();
    const containerRatio = container.clientWidth / container.clientHeight;
    const imageRatio = this.image!.width / this.image!.height;
    let ratio = 1;
    if (imageRatio > containerRatio) {
      ratio = container.clientWidth / this.image!.width;
    } else {
      ratio = container.clientHeight / this.image!.height; // 以高为基准
    }
    this.zoomRatio = ratio;
    return ratio;
  }
  /**
   * # 加载图片
   */
  public async loadImage(
    img: HTMLImageElement | string,
    bboxes: Konvalabel.BboxesItem[] = []
  ) {
    this.cancelDraw();
    this.destroyChildren();
    if (img instanceof HTMLImageElement) {
      this.image = img;
    } else {
      this.image = await imageOnLoad(img);
    }
    this.imageNode = new Konva.Image({
      image: this.image,
      width: 0,
      height: 0,
      x: 0, // 不需要居中，因为画布宽度等于图片宽度
      y: 0,
    });
    this.layer.add(this.imageNode);
    this.imageNode.moveToBottom();
    this.fitStageToContainer();
    this.layer.draw();
    //绘制标注框,初始化的
    if (bboxes.length) {
      this.bboxes = bboxes;
      bboxes.forEach((item) => {
        this.drawBox(item);
      });
    }
    this.emitChange('init');
    return 'ok';
  }
  /**
   * 获取所有文本
   */
  public getAllText(): Array<Konva.Text> {
    return this.layer.getChildren(
      (node) => node.getClassName() === 'Text'
    ) as Array<Konva.Text>;
  }
  /**
   * 获取所有标注框
   */
  public getAllRect(): Array<Konva.Rect> {
    return this.layer.getChildren(
      (node) => node.getClassName() === 'Rect'
    ) as Array<Konva.Rect>;
  }
  //获取选中的节点
  public getTransformerNodes(): Array<Konva.Rect> {
    if (!this.transformer) return [];
    return this.transformer.nodes() as Array<Konva.Rect>;
  }
  //取消绘制标注框
  public cancelDraw() {
    this.labelInfo = {}; //重置新绘制标签的名称
    this.stage.draggable(true); //设置画布拖动
    this.stage.container().style.cursor = 'default';
    this.currentShape = null;
    this.transformer && this.transformer.nodes([]);
  }
  public draw(labelInfo: Konvalabel.LabelInfo) {
    this.labelInfo = labelInfo;
    this.stage.draggable(false);
    this.stage.container().style.cursor = 'crosshair';
  }
  /**
   * 删除选中的标注
   */
  public deleteSelected() {
    if (!this.transformer) return;
    const selectedNodes = this.transformer.nodes();
    const textList = this.getAllText();
    selectedNodes.forEach((node) => {
      const find = textList.find((i) => i.id() === node.id());
      if (find) {
        find.destroy();
        node.destroy();
        this.emitChange('delete');
      }
    });
    this.transformer.nodes([]);
    this.layer.draw();
  }
  /**
   * 通过id删除标注
   * @param {string} id 标注id
   */
  public deleteById(id: string) {
    const textList = this.getAllText();
    const rectList = this.getAllRect();
    const findIndex = rectList.findIndex((i) => i.id() === id);
    if (findIndex !== -1) {
      const find = rectList[findIndex];
      const findText = textList[findIndex];
      findText?.destroy();
      find?.destroy();
      this.emitChange('delete');
    }
  }

  /**
   * 选中标注框进行编辑
   * @param {Konva.Rect} rect konva.Rect的实列
   */
  public createTransformer(rect: Shape<ShapeConfig> | Stage) {
    if (this.transformer) {
      //取消选择
      this.transformer.nodes().forEach((i) => {
        i.draggable(false);
        //回复原来的样式
        i.setAttr(
          'fill',
          toRgba(i.getAttr('stroke'), this.labelConfig.fillOpacity)
        ); //回复原来的颜色
      });
      this.transformer.destroy(); //销毁
      this.transformer = null; //清空
      this.emitChange('update'); //更新
    } else {
      //选择选中的标注框
      if (rect && rect.getClassName() === 'Rect') {
        rect.draggable(true);
        this.transformer = new Konva.Transformer({
          rotateEnabled: true,
          flipEnabled: false,
          ignoreStroke: true,
          keepRatio: false,
          resizeEnabled: true,
          anchorSize: 8,
          zoomedIn: this.stage.scaleX() > 1,
          boundBoxFunc: this.constrainSizes,
        });
        rect.setAttr(
          'fill',
          toRgba(rect.getAttr('stroke'), this.labelConfig.selectOpacity)
        ); //选中时的颜色
        this.layer.add(this.transformer);
        this.transformer.attachTo(rect);
        this.layer.draw();
      }
    }
  }
  /**
   * 修改选中透明度
   * @param {number} opacity 透明度
   */
  public updateSelectOpacity(number: number) {
    this.labelConfig.selectOpacity = number;
    const transformerNodes = this.getTransformerNodes();
    transformerNodes.length &&
      transformerNodes.forEach((item) => {
        item.setAttr(
          'fill',
          toRgba(item.getAttr('stroke'), this.labelConfig.selectOpacity)
        );
      });
  }
  /**
   * 更新填充透明度
   */
  public updateFillOpacity(number: number) {
    this.labelConfig.fillOpacity = number;
    const rects = this.getAllRect();
    const transformerNodes = this.getTransformerNodes();
    rects.forEach((item) => {
      if (
        !transformerNodes.length ||
        transformerNodes.every((node) => node.id() !== item.id())
      ) {
        item.setAttr(
          'fill',
          toRgba(item.getAttr('stroke'), this.labelConfig.fillOpacity)
        );
      }
    });
  }

  /**
   * 更新标注框的名称
   */
  public updateLabelName(id: string | number, data: Konvalabel.LabelInfo) {
    const rectList = this.getAllRect();
    const find = rectList.find((i) => i.id() == id);
    if (find) {
      find.attrs.data = data;
      this.updateText(find);
      this.emitChange('update');
    }
  }
  /**
   * 重置缩放工具
   */
  public resetZoom() {
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.layer.draw();
  }
  /**
   * # 绘制已经存在的标注框
   * @param {Array} data 标注框的原始数据
   */
  public drawBox(data: Konvalabel.BboxesItem) {
    const left = data.box[0] * this.zoomRatio;
    const top = data.box[1] * this.zoomRatio;
    const width = (data.box[2] - data.box[0]) * this.zoomRatio;
    const height = (data.box[3] - data.box[1]) * this.zoomRatio;
    this.createLabel({
      id: (data.id as string) || Date.now().toString(),
      x: left,
      y: top,
      width,
      height,
      labelInfo: {
        ...data,
        label: data.label,
      },
    });
  }

  public destroy() {
    if (this.stage) {
      this.stage.destroy();
    }
    window.removeEventListener('resize', this.fitStageToContainer);
  }
}
