/* LODOP 技术文档数据层
 * 内容整理自《Lodop技术手册 6.2.2.6》
 */
const CATS = [
  { key: 'all', label: '全部' },
  { key: 'init', label: '初始化' },
  { key: 'item', label: '打印项' },
  { key: 'output', label: '输出控制' },
  { key: 'style', label: '样式' },
  { key: 'device', label: '打印设备' },
  { key: 'mode', label: '模式设置' },
  { key: 'data', label: '数据与文件' }
];

const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.key, c.label]));

const APIS = [
  /* ---------------- 初始化 ---------------- */
  {
    id: 'version', name: 'VERSION', zh: '获得软件版本号', cat: 'init', group: 'basic',
    sig: 'LODOP.VERSION',
    desc: '返回当前控件的版本号，格式为 X.X.X.X。常用来判断控件是否已安装、是否需要升级。',
    ret: 'string',
    example: `var v = LODOP.VERSION;
if (v < "6.2.0.3") alert("控件版本过低");`
  },
  {
    id: 'print-init', name: 'PRINT_INIT', zh: '打印初始化', cat: 'init', group: 'basic',
    sig: 'PRINT_INIT(strTaskName)',
    desc: '初始化打印运行环境，清理异常打印遗留的资源，并设定打印任务名。每个打印事务至少调用一次，建议放在打印程序的第一行。',
    params: [{ n: 'strTaskName', t: 'string', d: '打印任务名，需符合 Windows 文件起名规则。为空时控件不保存本地化信息（打印维护的设置），布局完全由程序控制。' }],
    ret: 'boolean — 成功为真；前一个事务未完成或系统没有打印机时失败',
    example: `LODOP.PRINT_INIT("订单系统_销售单打印");
// 不希望最终用户调整布局时：
LODOP.PRINT_INIT("");`,
    note: '任务名尽量具备唯一性，例如“XX单位_XX系统_XX模块_XX打印作业”，控件会按该名记忆打印维护信息。'
  },
  {
    id: 'print-inita', name: 'PRINT_INITA', zh: '增强型打印初始化', cat: 'init', group: 'enhanced',
    sig: 'PRINT_INITA(Top, Left, Width, Height, strPrintName)',
    desc: '在初始化的同时设定整页偏移量和可视编辑区域大小。需要控制页边距，或编辑区域与纸张实际尺寸不一致时使用。',
    params: [
      { n: 'Top / Left', t: 'number | string', d: '整页上、左边距，整数默认单位 px，可带 mm / cm / in / pt / %。' },
      { n: 'Width / Height', t: 'number | string', d: '可视编辑区域宽高，默认 800 × 600px。' },
      { n: 'strPrintName', t: 'string', d: '打印任务名，含义同 PRINT_INIT。' }
    ],
    ret: 'boolean',
    example: `LODOP.PRINT_INITA(10, 10, 762, 533, "移动公司发票全样");`,
    note: '若未调用本函数但调用了 SET_PRINT_PAGESIZE，纸张尺寸会影响（代替）这里的 Width 和 Height。'
  },
  {
    id: 'set-print-pagesize', name: 'SET_PRINT_PAGESIZE', zh: '设定纸张大小', cat: 'init', group: 'basic',
    sig: 'SET_PRINT_PAGESIZE(intOrient, PageWidth, PageHeight, strPageName)',
    desc: '设定固定纸张或“宽度固定、高度自适应”的纸张，并指定打印方向、自定义尺寸或系统纸张名。',
    params: [
      { n: 'intOrient', t: 'number', d: '1 纵向固定纸张；2 横向固定纸张；3 纵向、宽度固定、高度自适应；0 由操作者或打印机默认决定。' },
      { n: 'PageWidth / PageHeight', t: 'number | string', d: '整数默认单位 0.1mm（45 即 4.5mm）；字符串可带 in / cm / mm / pt。为 0 时无效。' },
      { n: 'strPageName', t: 'string', d: '操作系统中的纸张名，如 "A4"；关键字 "CreateCustomPage" 会按宽高创建 LodopCustomPage 自定义纸张。' }
    ],
    ret: '无',
    example: `// 210mm × 297mm，纵向
LODOP.SET_PRINT_PAGESIZE(1, 2100, 2970, "");
// 系统 A4，横向
LODOP.SET_PRINT_PAGESIZE(2, 0, 0, "A4");`,
    note: '纸张优先级：打印维护中的“本机自行定义纸张” > 本函数 > 上次预览时选择的纸张 > 打印机默认纸张。'
  },
  {
    id: 'set-licenses', name: 'SET_LICENSES', zh: '设置软件注册信息', cat: 'init', group: 'basic',
    sig: 'SET_LICENSES(strCompanyName, strLicense)',
    desc: '设置共享软件注册信息，激活“直接打印”和“导出 Excel”等注册功能，同时去除输出左下角的试用水印。',
    params: [
      { n: 'strCompanyName', t: 'string', d: '注册单位名称。' },
      { n: 'strLicense', t: 'string', d: '注册号。' }
    ],
    ret: 'boolean',
    example: `LODOP.SET_LICENSES("某某单位", "注册号");`,
    note: '建议放在初始化之后、增加打印项之前调用。'
  },

  /* ---------------- 打印项 ---------------- */
  {
    id: 'add-print-htm', name: 'ADD_PRINT_HTM', zh: '增加超文本打印项（普通模式）', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_HTM(Top, Left, Width, Height, strHtmlContent)',
    desc: '在指定位置和区域内输出 HTML 内容，自动折行、自动分页，是构建复杂版面的主力函数。',
    params: [
      { n: 'Top / Left', t: 'number | string', d: '打印项在纸张内的上、左边距。整数默认 px，字符串可带单位或百分比。' },
      { n: 'Width / Height', t: 'number | string', d: '打印区域宽高。可用 RightMargin / BottomMargin 转义为右边距、下边距。' },
      { n: 'strHtmlContent', t: 'string', d: 'HTML 代码、代码段落，或 "URL:地址"。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_HTM(10, 10, "100%", 200,
  "<div style='font-size:18px;font-weight:bold'>销售出库单</div>");`,
    note: '专有语法：style="page-break-after:always" 强制分页；IMG 的 transcolor 属性实现透明底图（可做“先字后章”）；borderthin="true" 合并单元格使用单细线。'
  },
  {
    id: 'add-print-html', name: 'ADD_PRINT_HTML', zh: '增加超文本打印项（图形模式）', cat: 'item', group: 'enhanced',
    sig: 'ADD_PRINT_HTML(Top, Left, Width, Height, strHtmlContent)',
    desc: '参数与 ADD_PRINT_HTM 相同，以图形模式输出，速度更快。适合单页内完成、不要求针式机文本质量的场景。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域，同 ADD_PRINT_HTM。' },
      { n: 'strHtmlContent', t: 'string', d: 'HTML 内容或 URL。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_HTML(0, 0, 300, 100, "<hr><font size=5>hello</font>");`,
    note: '内容未被自动分页时采用矢量快照，质量与文本模式一致且更快，是最推荐模式。'
  },
  {
    id: 'add-print-table', name: 'ADD_PRINT_TABLE', zh: '增加表格打印项（超文本模式）', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_TABLE(Top, Left, Width, Height, strHtml)',
    desc: '只输出首个 table 的显示内容。表格分页时，thead / tfoot 会在每一页自动重复，并可做本页小计、累计合计等统计。',
    params: [
      { n: 'Top / Left', t: 'number | string', d: '表头（thead）在纸张内的上、左边距。' },
      { n: 'Width / Height', t: 'number | string', d: '区域宽度、表体（tbody）高度；超出后自动分页，每页至少打印一个首层 TR。' },
      { n: 'strHtml', t: 'string', d: '包含至少一个 table 的 HTML，或 "URL:地址"。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_TABLE(40, 10, "100%", 400,
  "<table border='1'><thead><tr><th>商品</th><th>数量</th></tr></thead>" +
  "<tbody><tr><td>打印纸</td><td>2</td></tr></tbody></table>");`,
    note: '统计属性 tdata 支持 SubSum（本页合计）、Sum（累计）、AllSum（总计）等；format 控制显示格式，tclass 分类统计，tindex 指定数据列。'
  },
  {
    id: 'add-print-tburl', name: 'ADD_PRINT_TBURL', zh: '增加表格打印项（URL 模式）', cat: 'item', group: 'enhanced',
    sig: 'ADD_PRINT_TBURL(Top, Left, Width, Height, strURL)',
    desc: '按 URL 装载 HTML，只输出第一个 table 的内容，功能同 ADD_PRINT_TABLE。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域。' },
      { n: 'strURL', t: 'string', d: '页面地址。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_TBURL(0, 0, "100%", "100%", "http://x.com/table.htm");`
  },
  {
    id: 'add-print-url', name: 'ADD_PRINT_URL', zh: '增加超文本打印项（URL 模式）', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_URL(Top, Left, Width, Height, strURL)',
    desc: '按 URL 地址装载页面并作为打印项输出，内容超出区域高度时自动分页。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域大小。' },
      { n: 'strURL', t: 'string', d: '页面 URL。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_URL(0, 0, "100%", "100%", "http://www.baidu.com");`
  },
  {
    id: 'add-print-text', name: 'ADD_PRINT_TEXT', zh: '增加纯文本打印项', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_TEXT(Top, Left, Width, Height, strContent)',
    desc: '在指定区域内输出纯文本，自动折行。内容超出高度时，多页项会继续分页，普通项则被截取。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域大小。' },
      { n: 'strContent', t: 'string', d: '文本内容，长度不限。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_TEXT(11, 23, 98, 19, "收货人：张三");
LODOP.ADD_PRINT_TEXT("2.9mm", "6.1mm", "25.9mm", "5mm", "新加文本");`
  },
  {
    id: 'add-print-texta', name: 'ADD_PRINT_TEXTA', zh: '增强型纯文本打印项', cat: 'item', group: 'enhanced',
    sig: 'ADD_PRINT_TEXTA(strItemName, Top, Left, Width, Height, strContent)',
    desc: '同 ADD_PRINT_TEXT，但可为打印项声明项目名，便于在打印项序号难以控制时用 SET_PRINT_STYLEA 精确操作。',
    params: [
      { n: 'strItemName', t: 'string', d: '项目名，长度不限。' },
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域大小。' },
      { n: 'strContent', t: 'string', d: '文本内容。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_TEXTA("totalMoney", 500, 400, 200, 30, "合计：￥128.00");
LODOP.SET_PRINT_STYLEA("totalMoney", "FontColor", "#e11d48");`
  },
  {
    id: 'add-print-image', name: 'ADD_PRINT_IMAGE', zh: '增加图片打印项', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_IMAGE(Top, Left, Width, Height, strHtmlContent)',
    desc: '输出一张图片，内容可以是 IMG 标签、本地文件全路径或 URL。图片过大时被截取，不会分页。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '位置与区域大小。' },
      { n: 'strHtmlContent', t: 'string', d: 'IMG 标签片段、"C:/test.jpg" 或 "URL:地址"。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_IMAGE(10, 10, 300, 160, "<img src='logo.png'/>");`
  },
  {
    id: 'add-print-rect', name: 'ADD_PRINT_RECT', zh: '增加矩形线', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_RECT(Top, Left, Width, Height, intLineStyle, intLineWidth)',
    desc: '绘制矩形框，可设置线型与线宽。建议在文本类函数之前调用，让线条位于文字下层。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '矩形的位置与大小。' },
      { n: 'intLineStyle', t: 'number', d: '0 实线；1 破折线；2 点线；3 点划线；4 双点划线。' },
      { n: 'intLineWidth', t: 'number', d: '线宽，单位打印像素，默认 1。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_RECT(10, 10, 100, 60, 0, 1);`
  },
  {
    id: 'add-print-ellipse', name: 'ADD_PRINT_ELLIPSE', zh: '增加椭圆线', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_ELLIPSE(Top, Left, Width, Height, intLineStyle, intLineWidth)',
    desc: '绘制椭圆线，宽高相等时为正圆。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '椭圆外缘矩形的位置与大小。' },
      { n: 'intLineStyle', t: 'number', d: '0 实线；1 破折线；2 点线；3 点划线；4 双点划线。' },
      { n: 'intLineWidth', t: 'number', d: '线宽，默认 1。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_ELLIPSE(10, 10, 100, 60, 0, 1);`
  },
  {
    id: 'add-print-line', name: 'ADD_PRINT_LINE', zh: '增加直线', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_LINE(Top1, Left1, Top2, Left2, intLineStyle, intLineWidth)',
    desc: '按两个端点绘制直线，可设置线型与线宽。',
    params: [
      { n: 'Top1 / Left1', t: 'number | string', d: '端点 1 的上边距、左边距。' },
      { n: 'Top2 / Left2', t: 'number | string', d: '端点 2 的位置，可用 BottomMargin / RightMargin 转义。' },
      { n: 'intLineStyle', t: 'number', d: '0 实线；1 破折线；2 点线；3 点划线；4 双点划线。' },
      { n: 'intLineWidth', t: 'number', d: '线宽，默认 1。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_LINE(106, 83, 46, 183, 0, 1);`
  },
  {
    id: 'add-print-barcode', name: 'ADD_PRINT_BARCODE', zh: '增加条形码', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_BARCODE(Top, Left, Width, Height, CodeType, CodeValue)',
    desc: '在打印机上直接绘制一维码或二维码，密度随宽度自动调整。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '条码的位置与大小。' },
      { n: 'CodeType', t: 'string', d: '128A/128B/128C/128Auto、EAN8/EAN13、Code39/93、UPC、MSI、Codabar、QRCode、PDF417 等。' },
      { n: 'CodeValue', t: 'string', d: '条码值。不同码制对长度和字符集有限制。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_BARCODE(56, 48, 238, 62, "128Auto", "123456789012");
LODOP.ADD_PRINT_BARCODE(56, 48, 122, 115, "QRCode", "订单2026-1020");`,
    note: '二维码版本、纠错级别等可用 SET_PRINT_STYLEA(0, "QRCodeVersion", 3) 等方式细调。'
  },
  {
    id: 'add-print-chart', name: 'ADD_PRINT_CHART', zh: '增加图表', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_CHART(Top, Left, Width, Height, ChartType, strHtml)',
    desc: '用 HTML table 的数据生成图表，支持折线、柱状、条形、面积、散点、饼图、甘特图、箭头图、气泡图、几何图。',
    params: [
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '图表的位置与大小。' },
      { n: 'ChartType', t: 'number', d: '0 折线；1 柱状；2 条形；3 面积；4 散点；5 饼图；6 直线；7 甘特；8 箭头；9 气泡；10 几何图。' },
      { n: 'strHtml', t: 'string', d: '提供数据的 table 超文本（首行为标签，首列为图例）。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_CHART(0, 0, 420, 190, 1,
  "<table><tr><td>月份</td><td>销量</td></tr><tr><td>一月</td><td>120</td></tr></table>");`
  },
  {
    id: 'add-print-shape', name: 'ADD_PRINT_SHAPE', zh: '增强型增加图形', cat: 'item', group: 'enhanced',
    sig: 'ADD_PRINT_SHAPE(intShapeType, Top, Left, Width, Height, intLineStyle, intLineWidth, varColor)',
    desc: '用一条语句绘制直线、矩形、椭圆或它们的实心版本，并可指定颜色。',
    params: [
      { n: 'intShapeType', t: 'number', d: '0 仰角直线；1 俯角直线；2 矩形框；3 椭圆线；4 实心矩形；5 实心椭圆。' },
      { n: 'Top / Left / Width / Height', t: 'number | string', d: '外缘矩形的位置与大小。' },
      { n: 'intLineStyle / intLineWidth', t: 'number', d: '线型与线宽。' },
      { n: 'varColor', t: 'number | string', d: '颜色，支持十进制 RGB、#十六进制或英文颜色名。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_SHAPE(4, 70, 59, 100, 60, 0, 1, "#FF0000");`
  },
  {
    id: 'add-print-data', name: 'ADD_PRINT_DATA', zh: '装载文档式模板', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_DATA(strDataStyle, varDataValue)',
    desc: '直接加载“文档式模板”（Base64 字符串），不需要 eval。配合 GET_VALUE("ProgramData") 可实现模板的保存、传递与复用。',
    params: [
      { n: 'strDataStyle', t: 'string', d: '固定关键字 "ProgramData"。' },
      { n: 'varDataValue', t: 'string', d: '文档式模板的 Base64 内容。' }
    ],
    ret: '无',
    example: `LODOP.ADD_PRINT_DATA("ProgramData", "@J0yHEH1QG1IBIS0APy...==");`,
    note: '取模板：GET_VALUE("ProgramData", 0)；改模板中某项内容：SET_PRINT_STYLEA(项目名, "CONTENT", 新值)。'
  },
  {
    id: 'add-print-setup-bkimg', name: 'ADD_PRINT_SETUP_BKIMG', zh: '指定背景图', cat: 'item', group: 'basic',
    sig: 'ADD_PRINT_SETUP_BKIMG(strImgHtml)',
    desc: '为打印维护 / 打印设计 / 预览界面指定背景底图，常用于套打票据。',
    params: [{ n: 'strImgHtml', t: 'string', d: 'IMG 标签形式的图片内容。' }],
    ret: '无',
    example: `LODOP.ADD_PRINT_SETUP_BKIMG("<img src='bg.png'>");`,
    note: '是否在预览、打印中包含背景图，用 SET_SHOW_MODE 的 BKIMG_IN_PREVIEW、BKIMG_PRINT 控制。'
  },

  /* ---------------- 样式 ---------------- */
  {
    id: 'set-print-style', name: 'SET_PRINT_STYLE', zh: '设置打印项风格', cat: 'style', group: 'basic',
    sig: 'SET_PRINT_STYLE(strStyleName, varStyleValue)',
    desc: '设置后续新增打印项的默认风格。必须在初始化之后、添加打印项之前调用。',
    params: [
      { n: 'strStyleName', t: 'string', d: 'FontName、FontSize(pt)、FontColor、Bold、Italic、Underline、Alignment(1左/2中/3右)、Angle、ItemType(0普通/1页眉页脚/2页号/3页数/4多页)、HOrient、VOrient、PenWidth、PenStyle、Stretch(0截取/1变形/2等比)、PreviewOnly、ReadOnly。' },
      { n: 'varStyleValue', t: 'any', d: '对应风格值。颜色支持十进制 RGB、#十六进制、英文颜色名。' }
    ],
    ret: '无',
    example: `LODOP.SET_PRINT_STYLE("FontName", "微软雅黑");
LODOP.SET_PRINT_STYLE("FontSize", 11);
LODOP.SET_PRINT_STYLE("FontColor", "#1677ff");`,
    note: '页号 / 页数项的文本中，“#”代表当前页号，“&”代表总页数。'
  },
  {
    id: 'set-print-stylea', name: 'SET_PRINT_STYLEA', zh: '增强型设置打印项风格', cat: 'style', group: 'enhanced',
    sig: 'SET_PRINT_STYLEA(varItemNameID, strStyleName, varStyleValue)',
    desc: '只对单个打印项设置风格，继承 SET_PRINT_STYLE 的全部属性，并支持页号控制、内容替换、删除恢复等扩展属性。',
    params: [
      { n: 'varItemNameID', t: 'number | string', d: '序号从 1 开始；0 表示最后加入的项；负数表示向前偏移；也可传项目名或 Selected / unSelected / All / First / Last 关键字。' },
      { n: 'strStyleName', t: 'string', d: '继承全部风格名，另支持 PageIndex、PageUnIndex、NumberStartPage、StartNumberValue、Content、Deleted、LineSpacing、LetterSpacing、ItemName、TransColor、GroundColor、SpacePatch、AlignJustify 及条码/图表专用属性。' },
      { n: 'varStyleValue', t: 'any', d: '对应属性值。位置类属性支持 "++2mm" 增量、"BottomMargin:++2mm" 转义。' }
    ],
    ret: '无',
    example: `LODOP.SET_PRINT_STYLEA(0, "PageIndex", "first");   // 仅首页输出
LODOP.SET_PRINT_STYLEA(0, "PageUnIndex", "1,2"); // 第 1、2 页不输出
LODOP.SET_PRINT_STYLEA("totalMoney", "FontSize", 14);
LODOP.SET_PRINT_STYLEA(0, "Top", "++2mm");       // 下移 2mm`
  },

  /* ---------------- 输出控制 ---------------- */
  {
    id: 'preview', name: 'PREVIEW', zh: '打印预览', cat: 'output', group: 'basic',
    sig: 'PREVIEW()',
    desc: '打开打印预览界面。若预览为独立弹窗，关闭时返回实际打印次数（大于 0）。',
    ret: 'number（弹窗时）',
    example: `LODOP.PREVIEW();`
  },
  {
    id: 'print', name: 'PRINT', zh: '直接打印', cat: 'output', group: 'basic',
    sig: 'PRINT()',
    desc: '跳过预览直接打印。需要注册使用权，否则输出左下角带试用水印。',
    ret: 'boolean — 打印成功为真',
    example: `if (!LODOP.PRINT()) alert("打印失败，请检查打印机");`
  },
  {
    id: 'print-setup', name: 'PRINT_SETUP', zh: '打印维护', cat: 'output', group: 'basic',
    sig: 'PRINT_SETUP()',
    desc: '面向最终用户的布局维护界面，可移动、缩放、调整字体等，但不能增删打印项。',
    ret: 'number — 弹窗关闭时返回实际打印次数',
    example: `LODOP.PRINT_SETUP();`
  },
  {
    id: 'print-design', name: 'PRINT_DESIGN', zh: '打印设计', cat: 'output', group: 'basic',
    sig: 'PRINT_DESIGN()',
    desc: '面向开发者的设计界面，可增删打印项、自由排版，关闭后返回生成的程序代码。',
    ret: 'string — 生成的程序代码',
    example: `var code = LODOP.PRINT_DESIGN();`
  },
  {
    id: 'newpage', name: 'NEWPAGE', zh: '强制分页', cat: 'output', group: 'basic',
    sig: 'NEWPAGE()',
    desc: '在当前位置强制换页，之后添加的内容从新页开始输出。',
    ret: 'boolean',
    example: `LODOP.ADD_PRINT_TEXT(10, 10, 300, 30, "第一页");
LODOP.NEWPAGE();
LODOP.ADD_PRINT_TEXT(10, 10, 300, 30, "第二页");`
  },
  {
    id: 'newpagea', name: 'NEWPAGEA', zh: '增强型强制分页', cat: 'output', group: 'enhanced',
    sig: 'NEWPAGEA()',
    desc: '增强型强制分页，配合增强型打印项使用。',
    ret: 'boolean',
    example: `LODOP.NEWPAGEA();`
  },
  {
    id: 'previewa', name: 'PREVIEWA', zh: '增强型打印预览 A', cat: 'output', group: 'enhanced',
    sig: 'PREVIEWA()',
    desc: '增强型预览接口，适合与 PRINT_INITA 及增强打印项配合的模板流程。',
    ret: 'number（弹窗时）',
    example: `LODOP.PREVIEWA();`
  },
  {
    id: 'previewb', name: 'PREVIEWB', zh: '增强型打印预览 B', cat: 'output', group: 'enhanced',
    sig: 'PREVIEWB()',
    desc: '另一组增强型预览接口，流程与 PREVIEWA 类似，用于模板批量输出场景。',
    ret: 'number（弹窗时）',
    example: `LODOP.PREVIEWB();`
  },
  {
    id: 'printa', name: 'PRINTA', zh: '增强型直接打印 A', cat: 'output', group: 'enhanced',
    sig: 'PRINTA()',
    desc: '增强型直接打印接口，需要注册使用权。',
    ret: 'boolean',
    example: `LODOP.PRINTA();`
  },
  {
    id: 'printb', name: 'PRINTB', zh: '增强型直接打印 B', cat: 'output', group: 'enhanced',
    sig: 'PRINTB()',
    desc: '与 PRINTA 对应的另一组增强型直接打印接口。',
    ret: 'boolean',
    example: `LODOP.PRINTB();`
  },
  {
    id: 'set-print-copies', name: 'SET_PRINT_COPIES', zh: '设置打印份数', cat: 'output', group: 'basic',
    sig: 'SET_PRINT_COPIES(intCopies)',
    desc: '设置本次打印任务的输出份数。',
    params: [{ n: 'intCopies', t: 'number', d: '打印份数。' }],
    ret: 'boolean',
    example: `LODOP.SET_PRINT_COPIES(2);`
  },
  {
    id: 'set-preview-window', name: 'SET_PREVIEW_WINDOW', zh: '设置预览窗口', cat: 'output', group: 'basic',
    sig: 'SET_PREVIEW_WINDOW(intDispMode, intToolMode, blDirectPrint, intWidth, intHeight, strTitleButtonCaption)',
    desc: '控制预览窗口的缩放模式、工具条形态、尺寸和标题 / 按钮文案。',
    params: [
      { n: 'intDispMode', t: 'number', d: '0 适高；1 正常大小；2 适宽。' },
      { n: 'intToolMode', t: 'number', d: '0 工具条；1 按钮；2 两者；3 都隐藏。' },
      { n: 'blDirectPrint', t: 'number', d: '1 打印按钮直接打印；0 弹出打印机选择。' },
      { n: 'intWidth / intHeight', t: 'number', d: '窗口尺寸（px），≤0 时最大化。' },
      { n: 'strTitleButtonCaption', t: 'string', d: '“窗口标题.按钮名”，如 "预览查看.开始打印"。' }
    ],
    ret: '无',
    example: `LODOP.SET_PREVIEW_WINDOW(0, 1, 1, 760, 540, "预览查看.开始打印");`
  },
  {
    id: 'save-to-file', name: 'SAVE_TO_FILE', zh: '导出数据到文件', cat: 'output', group: 'enhanced',
    sig: 'SAVE_TO_FILE(strFileName)',
    desc: '把打印内容导出为 Excel 或图片。“导出 Excel”属于注册功能。',
    params: [{ n: 'strFileName', t: 'string', d: '目标文件名及路径。.xls 导出表格；emf / jpg / jpeg / bmp / png 导出图片。' }],
    ret: 'boolean',
    example: `LODOP.SAVE_TO_FILE("订单数据.xls");
LODOP.SAVE_TO_FILE("打印结果.emf");`,
    note: '导出 Excel 时须用 ADD_PRINT_TABLE 加入表格；单元格的 xformat 属性可设置 Excel 数据类型。'
  },
  {
    id: 'set-save-mode', name: 'SET_SAVE_MODE', zh: '设置保存模式', cat: 'output', group: 'enhanced',
    sig: 'SET_SAVE_MODE(varModeName, varModeValue)',
    desc: '设置导出 Excel / 图片时的文件名提示、分页方式、边框、页眉页脚、快速模式等。',
    params: [
      { n: 'FILE_PROMPT', t: 'boolean', d: '保存前是否弹出文件名与路径选择，默认是。' },
      { n: 'PAGE_TYPE', t: 'number', d: '0 不分页；1 同一 Sheet 加分页符；2 分页到不同 Sheet。' },
      { n: 'LINESTYLE', t: 'number', d: '1 有边框；0 无边框。' },
      { n: 'QUICK_SAVE', t: 'boolean', d: '快速模式，忽略样式，适合大数据量。' },
      { n: '其它', t: 'string', d: 'CAPTION / CENTERHEADER / LEFTFOOTER / ORIENTATION / PAPERSIZE / ZOOM / RETURN_FILE_NAME / SAVEAS_IMGFILE_EXENAME 等。' }
    ],
    ret: 'boolean',
    example: `LODOP.SET_SAVE_MODE("PAGE_TYPE", 2);
LODOP.SET_SAVE_MODE("QUICK_SAVE", true);
LODOP.SAVE_TO_FILE("数据.xls");`
  },
  {
    id: 'show-chart', name: 'SHOW_CHART', zh: '显示图表', cat: 'output', group: 'enhanced',
    sig: 'SHOW_CHART()',
    desc: '配合 ADD_PRINT_CHART 使用，在设计或预览阶段刷新显示图表。',
    ret: '无',
    example: `LODOP.SHOW_CHART();`
  },

  /* ---------------- 设备 ---------------- */
  {
    id: 'get-printer-count', name: 'GET_PRINTER_COUNT', zh: '获得打印设备个数', cat: 'device', group: 'basic',
    sig: 'GET_PRINTER_COUNT()',
    desc: '返回操作系统内的打印设备数量，0 表示失败或没有设备。',
    ret: 'number',
    example: `var count = LODOP.GET_PRINTER_COUNT();`
  },
  {
    id: 'get-printer-name', name: 'GET_PRINTER_NAME', zh: '获得打印设备名称', cat: 'device', group: 'basic',
    sig: 'GET_PRINTER_NAME(strPrinterIDandType)',
    desc: '按设备序号取得打印机名称，常用于构建打印机下拉框。',
    params: [{ n: 'strPrinterIDandType', t: 'number | string', d: '设备序号或“序号+类型”标识。' }],
    ret: 'string',
    example: `for (var i = 1; i <= LODOP.GET_PRINTER_COUNT(); i++) {
  console.log(LODOP.GET_PRINTER_NAME(i));
}`
  },
  {
    id: 'set-printer-index', name: 'SET_PRINTER_INDEX', zh: '指定打印设备', cat: 'device', group: 'basic',
    sig: 'SET_PRINTER_INDEX(oIndexOrName)',
    desc: '按序号或名称指定输出打印机。指定后默认禁止用户再重选。',
    params: [{ n: 'oIndexOrName', t: 'number | string', d: '打印机序号或名称。' }],
    ret: 'boolean',
    example: `LODOP.SET_PRINTER_INDEX("Microsoft Print to PDF");`,
    note: '如需允许用户重选，配合 SET_PRINT_MODE("RESELECT_PRINTER", true)。'
  },
  {
    id: 'set-printer-indexa', name: 'SET_PRINTER_INDEXA', zh: '增强型指定打印设备', cat: 'device', group: 'enhanced',
    sig: 'SET_PRINTER_INDEXA(oIndexOrName)',
    desc: '增强型指定打印机接口，指定后允许重新选择。',
    params: [{ n: 'oIndexOrName', t: 'number | string', d: '打印机序号或名称。' }],
    ret: 'boolean',
    example: `LODOP.SET_PRINTER_INDEXA(1);`
  },
  {
    id: 'select-printer', name: 'SELECT_PRINTER', zh: '选择打印设备', cat: 'device', group: 'basic',
    sig: 'SELECT_PRINTER()',
    desc: '弹出打印机选择界面，由操作者选择目标设备。',
    ret: 'boolean',
    example: `LODOP.SELECT_PRINTER();`
  },

  /* ---------------- 模式 ---------------- */
  {
    id: 'set-show-mode', name: 'SET_SHOW_MODE', zh: '设置显示模式', cat: 'mode', group: 'basic',
    sig: 'SET_SHOW_MODE(strModeType, varModeValue)',
    desc: '控制预览 / 维护 / 设计界面的内嵌方式、背景图、按钮显隐、皮肤、语言等显示行为。',
    params: [
      { n: 'PREVIEW_IN_BROWSE', t: 'boolean', d: '预览界面是否内嵌到网页中。' },
      { n: 'SETUP_IN_BROWSE / DESIGN_IN_BROWSE', t: 'boolean', d: '维护 / 设计界面是否内嵌。' },
      { n: 'BKIMG_IN_PREVIEW / BKIMG_PRINT', t: 'boolean', d: '预览 / 打印是否包含背景图；FIRSTPAGE 变体可限定仅首页。' },
      { n: 'HIDE_*_PREVIEW / HIDE_*_SETUP', t: 'boolean', d: '隐藏预览或维护界面的打印、设置、关闭等按钮。' },
      { n: 'SKIN_TYPE', t: 'number', d: '0–20 固定皮肤；SKIN_CUSTOM_COLOR 可自定义颜色。' },
      { n: 'LANGUAGE', t: 'number', d: '0 简体中文；1 英文；2 繁体；3 BIG5。' },
      { n: '其它', t: 'boolean | string', d: 'SHOW_SCALEBAR 标尺、HIDE_PAGE_PERCENT 缩放框、NP_NO_RESULT 无返回防超时、SETUP_ENABLESS 权限控制串等。' }
    ],
    ret: 'boolean',
    example: `LODOP.SET_SHOW_MODE("PREVIEW_IN_BROWSE", true);
LODOP.SET_SHOW_MODE("BKIMG_IN_PREVIEW", 1);
LODOP.SET_SHOW_MODE("HIDE_PBUTTIN_PREVIEW", true);`
  },
  {
    id: 'set-print-mode', name: 'SET_PRINT_MODE', zh: '设置打印模式', cat: 'mode', group: 'basic',
    sig: 'SET_PRINT_MODE(strModeType, varModeValue)',
    desc: '设置双面打印、起止页、缩放、自动关闭预览、打印状态捕获、纸张基点和打印机控制等输出行为。',
    params: [
      { n: 'DOUBLE_SIDED_PRINT', t: 'boolean', d: '人工双面打印。' },
      { n: 'PRINT_START_PAGE / PRINT_END_PAGE', t: 'number', d: '指定起止页，默认打印全部。' },
      { n: 'PRINT_PAGE_PERCENT', t: 'string', d: '"Full-Width" / "Full-Height" / "Full-Page" 或 "80%"、"Width:80%;Height:90%"。' },
      { n: 'AUTO_CLOSE_PREWINDOW', t: 'boolean', d: '打印完成后自动关闭预览窗口。' },
      { n: 'CATCH_PRINT_STATUS', t: 'boolean', d: '捕获后台打印状态，之后用 GET_VALUE 读取。' },
      { n: 'POS_BASEON_PAPER', t: 'boolean', d: '以纸张边缘（而非可打印区域）为定位基点。' },
      { n: 'RESELECT_*', t: 'boolean', d: '允许重新选择打印机 / 纸张 / 方向 / 份数。' },
      { n: 'CONTROL_PRINTER:序号', t: 'string', d: '"PAUSE" 暂停、"RESUME" 恢复、"PURGE" 清理任务。' },
      { n: '其它', t: 'any', d: 'CUSTOM_TASK_NAME、NOCLEAR_AFTER_PRINT、PRINT_DUPLEX、PRINT_DEFAULTSOURCE、PRINT_TO_CODES、PRINT_NOCOLLATE、WINDOW_DEFPRINTER 等。' }
    ],
    ret: 'boolean | "ok"',
    example: `LODOP.SET_PRINT_MODE("PRINT_START_PAGE", 1);
LODOP.SET_PRINT_MODE("PRINT_END_PAGE", 3);
LODOP.SET_PRINT_MODE("POS_BASEON_PAPER", true);
LODOP.SET_PRINT_MODE("AUTO_CLOSE_PREWINDOW", true);`
  },
  {
    id: 'do-action', name: 'DO_ACTION', zh: '控制界面动作', cat: 'mode', group: 'enhanced',
    sig: 'DO_ACTION(ActName, ActValue)',
    desc: '对内嵌的预览 / 设计 / 维护界面执行动作，如翻页、缩放、打印、关闭等。',
    params: [
      { n: 'ActName', t: 'string', d: '动作名称，如 SETZOOM、PREV_PAGE、NEXT_PAGE、PRINT、PREVIEW、CLOSE 等。' },
      { n: 'ActValue', t: 'any', d: '动作参数，视具体动作而定。' }
    ],
    ret: 'boolean',
    example: `LODOP.DO_ACTION("SETZOOM", 8); // 100%`
  },

  /* ---------------- 数据与文件 ---------------- */
  {
    id: 'get-value', name: 'GET_VALUE', zh: '获得数据值', cat: 'data', group: 'basic',
    sig: 'GET_VALUE(ValueType, ValueIndex)',
    desc: '读取打印项属性、打印任务信息、打印状态、设计器坐标或生成的模板代码。',
    params: [
      { n: 'ValueType', t: 'string', d: 'ItemCount / ItemTop / ItemWidth / ItemContent / ItemNameID / ItemFontSize / PRINTED_TIMES / PRINTSETUP_PAGE_COUNT / PRINT_STATUS_TEXT / ProgramCodes / ProgramData 等数十种。' },
      { n: 'ValueIndex', t: 'number | string', d: '项目序号（从 1 起）、项目名，或 selected / unSelected / first / last。ProgramCodes 时 0 全部、1 排除初始化、2 排除纸张设置等。' }
    ],
    ret: 'string | number | boolean',
    example: `var top = LODOP.GET_VALUE("ItemTop", 1);
var content = LODOP.GET_VALUE("ItemContent", "myItm01");
var code = LODOP.GET_VALUE("ProgramCodes", 0);`,
    note: '打印状态类参数（PRINT_STATUS_*）需先 SET_PRINT_MODE("CATCH_PRINT_STATUS", true)，ValueIndex 传 JOB 代码。'
  },
  {
    id: 'format', name: 'FORMAT', zh: '数据格式转换', cat: 'data', group: 'basic',
    sig: 'FORMAT(oType, oValue)',
    desc: '完成日期、数值、金额大写、字符串校验、Base64、颜色、语音等格式转换。',
    params: [
      { n: 'TIME:格式', t: 'string', d: '"TIME:yyyy-mm-dd hh:mm:ss"、FloatValue、IsValidFormat、WeekIndex。' },
      { n: 'FLOAT:格式', t: 'string', d: '"FLOAT:#,##0.00" 等，0/#/./,/E 描述显示样式。' },
      { n: 'UpperMoney', t: 'string', d: '人民币大写。' },
      { n: 'CHAR:*', t: 'string', d: 'FirstPinYin 拼音首字母、IsCharacter、IsChinese、EncodeBase64、DecodeBase64。' },
      { n: 'FILE:*', t: 'string', d: 'EncodeBase64 / DecodeBase64 / WAVE 语音文件。' },
      { n: 'COLOR:*', t: 'string', d: 'Hex / Name / Decimal。' },
      { n: 'VOICE', t: 'string', d: '朗读文字，可设语速与音量。' }
    ],
    ret: 'string | number | boolean',
    example: `LODOP.FORMAT("UpperMoney", "1567.48"); // 壹仟伍佰陆拾柒元肆角捌分
LODOP.FORMAT("TIME:yyyy年mm月dd日", "now");
LODOP.FORMAT("FLOAT:#,##0.00", "12345.6");`
  },
  {
    id: 'get-dialog-value', name: 'GET_DIALOG_VALUE', zh: '获得对话框结果值', cat: 'data', group: 'basic',
    sig: 'GET_DIALOG_VALUE(oType, oPreValue)',
    desc: '弹出本地文件选择或颜色选择对话框，并返回选择结果。',
    params: [
      { n: 'oType', t: 'string', d: 'LocalFileFullName、LocalFileFullNameForOpen、LocalFileFullNameForSave、Color。' },
      { n: 'oPreValue', t: 'string', d: '文件类型过滤（如 "*.jpg;*.bmp"）或默认颜色值。' }
    ],
    ret: 'string',
    example: `var color = LODOP.GET_DIALOG_VALUE("Color", "#1677ff");
var file = LODOP.GET_DIALOG_VALUE("LocalFileFullName", "*.jpg;*.bmp");`
  },
  {
    id: 'get-system-info', name: 'GET_SYSTEM_INFO', zh: '获得系统信息', cat: 'data', group: 'basic',
    sig: 'GET_SYSTEM_INFO(strInfoType)',
    desc: '读取操作系统、浏览器、控件路径等环境信息。',
    params: [{ n: 'strInfoType', t: 'string', d: '信息类型关键字。' }],
    ret: 'string',
    example: `var info = LODOP.GET_SYSTEM_INFO("OS");`
  },
  {
    id: 'write-file-text', name: 'WRITE_FILE_TEXT', zh: '写本地文件内容', cat: 'data', group: 'basic',
    sig: 'WRITE_FILE_TEXT(intWriteMode, strFileName, strText)',
    desc: '向本地文件写入文本，可覆盖或追加。',
    params: [
      { n: 'intWriteMode', t: 'number', d: '写入模式（覆盖 / 追加）。' },
      { n: 'strFileName', t: 'string', d: '文件全路径。' },
      { n: 'strText', t: 'string', d: '要写入的文本。' }
    ],
    ret: 'boolean',
    example: `LODOP.WRITE_FILE_TEXT(0, "C:/temp/print.log", "打印完成");`
  },
  {
    id: 'get-file-text', name: 'GET_FILE_TEXT', zh: '读本地文件内容', cat: 'data', group: 'basic',
    sig: 'GET_FILE_TEXT(strFileName)',
    desc: '读取本地文本文件内容。',
    params: [{ n: 'strFileName', t: 'string', d: '文件全路径。' }],
    ret: 'string',
    example: `var text = LODOP.GET_FILE_TEXT("C:/temp/print.log");`
  },
  {
    id: 'get-file-time', name: 'GET_FILE_TIME', zh: '读本地文件时间', cat: 'data', group: 'basic',
    sig: 'GET_FILE_TIME(strFileName)',
    desc: '获得本地文件的最后修改时间。',
    params: [{ n: 'strFileName', t: 'string', d: '文件全路径。' }],
    ret: 'string',
    example: `var t = LODOP.GET_FILE_TIME("C:/temp/print.log");`
  },
  {
    id: 'is-file-exist', name: 'IS_FILE_EXIST', zh: '判断本地文件是否存在', cat: 'data', group: 'basic',
    sig: 'IS_FILE_EXIST(strFileName)',
    desc: '检查本地文件是否存在。',
    params: [{ n: 'strFileName', t: 'string', d: '文件全路径。' }],
    ret: 'boolean',
    example: `if (LODOP.IS_FILE_EXIST("C:/temp/print.log")) { /* ... */ }`
  },
  {
    id: 'get-print-iniffname', name: 'GET_PRINT_INIFFNAME', zh: '获得配置文件名', cat: 'data', group: 'basic',
    sig: 'GET_PRINT_INIFFNAME(strPrintTask)',
    desc: '取得指定打印任务对应的本地配置文件路径。',
    params: [{ n: 'strPrintTask', t: 'string', d: '打印任务名。' }],
    ret: 'string',
    example: `var ini = LODOP.GET_PRINT_INIFFNAME("订单打印");`
  },
  {
    id: 'get-pagesizes-list', name: 'GET_PAGESIZES_LIST', zh: '获得纸张类型名清单', cat: 'data', group: 'basic',
    sig: 'GET_PAGESIZES_LIST(oPrinterName, strSplit)',
    desc: '取得某台打印机支持的全部纸张名称，便于构建纸张选择器。',
    params: [
      { n: 'oPrinterName', t: 'string', d: '打印机名称。' },
      { n: 'strSplit', t: 'string', d: '名称之间的分隔符。' }
    ],
    ret: 'string',
    example: `var list = LODOP.GET_PAGESIZES_LIST("", ",");`
  },
  {
    id: 'send-print-rawdata', name: 'SEND_PRINT_RAWDATA', zh: '发送原始数据', cat: 'data', group: 'basic',
    sig: 'SEND_PRINT_RAWDATA(strRawData)',
    desc: '把 ESC/POS 等打印机原始指令直接发送到打印机。',
    params: [{ n: 'strRawData', t: 'string', d: '原始指令数据，编码由 SET_PRINT_MODE("SEND_RAW_DATA_ENCODE") 指定。' }],
    ret: 'boolean',
    example: `LODOP.SET_PRINT_MODE("SEND_RAW_DATA_ENCODE", "GBK");
LODOP.SEND_PRINT_RAWDATA("\\x1B\\x40...");`
  },
  {
    id: 'write-port-data', name: 'WRITE_PORT_DATA', zh: '写端口数据', cat: 'data', group: 'basic',
    sig: 'WRITE_PORT_DATA(strPortName, strData)',
    desc: '向指定端口写入数据，常用于串口设备。',
    params: [
      { n: 'strPortName', t: 'string', d: '端口名，如 COM1。' },
      { n: 'strData', t: 'string', d: '数据内容。' }
    ],
    ret: 'boolean',
    example: `LODOP.WRITE_PORT_DATA("COM1", "data");`
  },
  {
    id: 'read-port-data', name: 'READ_PORT_DATA', zh: '读端口数据', cat: 'data', group: 'basic',
    sig: 'READ_PORT_DATA(strPortName)',
    desc: '从指定端口读取数据。',
    params: [{ n: 'strPortName', t: 'string', d: '端口名。' }],
    ret: 'string',
    example: `var data = LODOP.READ_PORT_DATA("COM1");`
  }
];

/* 高阶能力（策展，指向具体 API） */
const ADVANCED = [
  {
    api: 'add-print-table', icon: 'layers', tone: 'teal', kicker: '打印项 · 表格',
    title: '表格自动跨页',
    desc: '只输出首个 table，表头表尾每页自动重复；配合 tdata 可直接生成“本页小计 / 累计合计”。',
    tags: ['thead 重复', '自动分页', 'SubSum / Sum']
  },
  {
    api: 'print-design', icon: 'code', tone: 'violet', kicker: '输出 · 设计器',
    title: '可视化排版，返回代码',
    desc: '在设计界面里拖动排版，关闭时直接拿到可复用的程序代码；PRINT_SETUP 还能把微调权交给最终用户。',
    tags: ['返回代码', '用户维护', '免写坐标']
  },
  {
    api: 'add-print-data', icon: 'file', tone: 'blue', kicker: '打印项 · 模板',
    title: '整套模板复用',
    desc: '把布局存成 Base64 文档式模板，跨页面、跨单据装载，配合 GET_VALUE("ProgramData") 保存与下发。',
    tags: ['Base64', '无需 eval', '模板下发']
  },
  {
    api: 'save-to-file', icon: 'download', tone: 'amber', kicker: '输出 · 导出',
    title: '导出 Excel 与图片',
    desc: '同一份内容既能打印，也能导出 .xls 或 PNG / EMF；SET_SAVE_MODE 控制分 Sheet、边框与快速模式。',
    tags: ['xls', 'PNG / EMF', '分 Sheet']
  },
  {
    api: 'set-print-mode', icon: 'zap', tone: 'rose', kicker: '模式 · 输出控制',
    title: '精调打印行为',
    desc: '双面、起止页、整页缩放、打印状态捕获、重选打印机，甚至暂停 / 恢复 / 清理打印任务。',
    tags: ['双面', '状态捕获', '任务控制']
  },
  {
    api: 'send-print-rawdata', icon: 'terminal', tone: 'slate', kicker: '数据 · 设备',
    title: '绕过排版，直写设备',
    desc: '把 ESC/POS 原始指令直接发给小票机，或通过 COM 口读写数据，对接串口外设。',
    tags: ['ESC/POS', 'COM 口', '设备对接']
  }
];

/* 快速开始 / 安装文件 */
const SYSTEM_FILES = [
  {
    name: 'install_lodop32.exe',
    tag: '控件安装包',
    desc: '适用于 32 位浏览器，安装 / 升级主程序。复制并改名 uninstall_lodop32.exe 可执行卸载。',
    icon: 'download'
  },
  {
    name: 'install_lodop64.exe',
    tag: '控件安装包',
    desc: '适用于 64 位浏览器。安装后在 Program Files\\MountTaiSoftware\\Lodop 生成 OCX 与 NP 插件。',
    icon: 'download'
  },
  {
    name: 'CLodopPrint_Setup_for_Win32NT.exe',
    tag: '云打印服务',
    desc: 'C-Lodop 云打印服务端，适用于 32 / 64 位系统。新版 Chrome、Edge、Firefox 等通过它打印。',
    icon: 'cloud'
  },
  {
    name: 'LodopFuncs.js',
    tag: '引导脚本',
    desc: '判断浏览器类型，选择控件或 C-Lodop 实例，检测版本并引导安装 / 升级。建议直接采用。',
    icon: 'code'
  }
];

/* 排版沙盒元素 */
const SANDBOX_ITEMS = [
  {
    key: 'title', label: '抬头与标题', on: true,
    code: `LODOP.ADD_PRINT_TEXT(10, 10, "100%", 24, "杭州云帆科技有限公司");
LODOP.SET_PRINT_STYLEA(0, "FontSize", 14);
LODOP.SET_PRINT_STYLEA(0, "Bold", 1);
LODOP.ADD_PRINT_TEXT(38, 10, "100%", 30, "销售出库单");
LODOP.SET_PRINT_STYLEA(0, "FontSize", 20);
LODOP.SET_PRINT_STYLEA(0, "Alignment", 2);`
  },
  {
    key: 'meta', label: '单据信息', on: true,
    code: `LODOP.ADD_PRINT_TEXT(76, 10, 200, 18, "客户：上海示例贸易有限公司");
LODOP.ADD_PRINT_TEXT(76, 280, 140, 18, "单号：SO-2026-1020");
LODOP.ADD_PRINT_TEXT(98, 10, 200, 18, "日期：2026-10-20");
LODOP.ADD_PRINT_TEXT(98, 280, 140, 18, "制单：李四");`
  },
  {
    key: 'table', label: '明细表格', on: true,
    code: `LODOP.ADD_PRINT_TABLE(126, 10, "100%", 180,
  "<table border='1' style='border-collapse:collapse;width:100%'>" +
  "<thead><tr><th>商品名称</th><th>规格</th><th>数量</th><th>金额</th></tr></thead>" +
  "<tbody><tr><td>A4 打印纸</td><td>80g</td><td>20</td><td>560.00</td></tr>" +
  "<tr><td>热敏标签纸</td><td>60×40</td><td>10</td><td>280.00</td></tr></tbody></table>");`
  },
  {
    key: 'total', label: '合计金额', on: true,
    code: `LODOP.ADD_PRINT_TEXT(322, 10, 300, 24, "合计金额（大写）：捌佰肆拾元整");
LODOP.SET_PRINT_STYLEA(0, "FontSize", 11);
LODOP.ADD_PRINT_TEXT(322, 300, 160, 24, "￥840.00");
LODOP.SET_PRINT_STYLEA(0, "FontSize", 13);
LODOP.SET_PRINT_STYLEA(0, "Bold", 1);
LODOP.SET_PRINT_STYLEA(0, "Alignment", 3);`
  },
  {
    key: 'barcode', label: '条形码', on: true,
    code: `LODOP.ADD_PRINT_BARCODE(360, 10, 200, 50, "128Auto", "SO20261020001");`
  },
  {
    key: 'qrcode', label: '二维码', on: false,
    code: `LODOP.ADD_PRINT_BARCODE(360, 300, 60, 60, "QRCode", "https://lodop.example/order/20261020001");`
  },
  {
    key: 'seal', label: '印章 / 图形', on: false,
    code: `LODOP.ADD_PRINT_SHAPE(3, 400, 240, 90, 90, 0, 2, "#c0392b");
LODOP.ADD_PRINT_TEXT(430, 260, 50, 20, "财务专用章");
LODOP.SET_PRINT_STYLEA(0, "FontColor", "#c0392b");
LODOP.SET_PRINT_STYLEA(0, "Alignment", 2);`
  },
  {
    key: 'footer', label: '页脚与页码', on: true,
    code: `LODOP.ADD_PRINT_TEXT("BottomMargin:34mm", 10, "70%", 18,
  "收货人：__________    审核：__________");
LODOP.SET_PRINT_STYLEA(0, "FontSize", 9);
LODOP.ADD_PRINT_TEXT("BottomMargin:12mm", 10, "100%", 16,
  "第 # 页 / 共 & 页");
LODOP.SET_PRINT_STYLEA(0, "ItemType", 1);
LODOP.SET_PRINT_STYLEA(0, "Alignment", 2);
LODOP.SET_PRINT_STYLEA(0, "FontSize", 8);`
  }
];
