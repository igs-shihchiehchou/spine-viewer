import SpineViewer from "./spine-viewer.js";

// 自动注册自定义元素（如果还没有注册的话）
if (!customElements.get("spine-viewer")) {
  customElements.define("spine-viewer", SpineViewer);
}

export default SpineViewer;
export { SpineViewer };
