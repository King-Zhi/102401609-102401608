/**
 * data.js - 校园失物招领数据管理层
 * 封装 LocalStorage 持久化存储与预设校园测试数据集
 */

const STORAGE_KEY = 'CAMPUS_LOST_FOUND_ITEMS_V2';

// 预设高真实度校园失物招领数据集（贴近福州大学校园实际场景）
const initialMockData = [
  {
    id: 1001,
    type: 'found', // found: 失物招领(捡到), lost: 寻物启事(丢失)
    title: '一区食堂二楼水吧捡到一张学生卡',
    category: '校园卡/证件',
    location: '旗山校区一区食堂二楼水吧附近餐桌',
    date: '2026-10-02',
    timestamp: Date.now() - 1000 * 60 * 25, // 25分钟前
    desc: '黑色龙猫卡套，姓名：张*华，卡号尾号3829。已交暂存于食堂值班阿姨处，请失主核对姓名及学院后认领！',
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=500&q=80',
    contactType: '微信',
    contactVal: 'fzu_helper_2026',
    status: 'open', // open: 进行中, solved: 已找到/已归还
    publisherName: '热心同学小林',
    isMine: true
  },
  {
    id: 1002,
    type: 'lost',
    title: '急寻！图书馆三楼西区遗落白色AirPods Pro耳机',
    category: '数码电子',
    location: '旗山校区图书馆三楼西区304自习室靠窗座位',
    date: '2026-10-02',
    timestamp: Date.now() - 1000 * 60 * 120, // 2小时前
    desc: '白色充电盒，套着黄色皮卡丘硅胶壳，盒盖内侧有些许铅笔划痕。内含备考期末录音资料，万分感谢捡到的同学，必有奶茶重谢！',
    img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=500&q=80',
    contactType: '手机号',
    contactVal: '13859012345',
    status: 'open',
    publisherName: '软件学院陈同学',
    isMine: false
  },
  {
    id: 1003,
    type: 'found',
    title: '西三教学楼201教室捡到一把黑色折叠伞',
    category: '生活钥匙',
    location: '西三教学楼201大教室第4排抽屉',
    date: '2026-10-01',
    timestamp: Date.now() - 1000 * 60 * 60 * 22, // 昨天
    desc: '黑色十骨天堂晴雨伞，手柄系有蓝色小熊挂绳，下雨天容易遗忘。目前暂存西三一楼保安室。',
    img: 'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=500&q=80',
    contactType: 'QQ',
    contactVal: '192837465',
    status: 'open',
    publisherName: '物信学院小王',
    isMine: false
  },
  {
    id: 1004,
    type: 'lost',
    title: '风雨操场草坪遗落一串宿舍钥匙',
    category: '生活钥匙',
    location: '风雨操场司令台正前方草坪',
    date: '2026-09-30',
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2天前
    desc: '钥匙串上有两把宿舍门钥匙和一把黑色自行车小钥匙，挂件是一个绿色小恐龙玩偶。',
    img: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=500&q=80',
    contactType: '微信',
    contactVal: 'key_master_fzu',
    status: 'solved', // 已成功找回
    publisherName: '数计学院小张',
    isMine: true
  },
  {
    id: 1005,
    type: 'found',
    title: '文科楼中庭石桌拾获《高等数学第七版》下册',
    category: '书籍文具',
    location: '文科楼中庭石桌遮阳伞下',
    date: '2026-09-29',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    desc: '书本扉页有铅笔写的姓名“李*涵”，夹着数张手写笔记草稿纸，请失主随时联系我认领。',
    img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80',
    contactType: '手机号',
    contactVal: '13950098765',
    status: 'open',
    publisherName: '经管学院刘同学',
    isMine: false
  },
  {
    id: 1006,
    type: 'lost',
    title: '一区田径场看台丢失蓝色膳魔师保温水杯',
    category: '其他物品',
    location: '一区田径场看台第三排中段',
    date: '2026-09-28',
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
    desc: '深蓝色杯身，表面贴有皮卡丘反光贴纸，杯底有少许掉漆磨损痕迹。',
    img: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=500&q=80',
    contactType: '微信',
    contactVal: 'water_cup_seeker',
    status: 'solved',
    publisherName: '电气学院郑同学',
    isMine: false
  }
];

const DataManager = {
  /**
   * 初始化并获取所有数据
   */
  getItems() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.saveItems(initialMockData);
        return [...initialMockData];
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveItems(initialMockData);
      return [...initialMockData];
    } catch (e) {
      console.warn('读取本地数据失败，回退到预设数据', e);
      return [...initialMockData];
    }
  },

  /**
   * 保存列表至本地缓存
   */
  saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (e) {
      console.error('存储数据失败', e);
      return false;
    }
  },

  /**
   * 根据 ID 查询单个物品
   */
  getItemById(id) {
    const items = this.getItems();
    return items.find(it => String(it.id) === String(id)) || null;
  },

  /**
   * 添加新发布的物品
   */
  addItem(rawItem) {
    const items = this.getItems();
    const newItem = {
      ...rawItem,
      id: Date.now(),
      timestamp: Date.now(),
      status: 'open',
      isMine: true,
      publisherName: rawItem.publisherName || '我发布的信息'
    };
    items.unshift(newItem);
    this.saveItems(items);
    return newItem;
  },

  /**
   * 更新物品状态（已找到/已归还）
   */
  updateItemStatus(id, newStatus = 'solved') {
    const items = this.getItems();
    const target = items.find(it => String(it.id) === String(id));
    if (target) {
      target.status = newStatus;
      target.resolvedTime = new Date().toISOString();
      this.saveItems(items);
      return true;
    }
    return false;
  },

  /**
   * 删除物品（用于我的发布管理）
   */
  deleteItem(id) {
    let items = this.getItems();
    const initialLen = items.length;
    items = items.filter(it => String(it.id) !== String(id));
    if (items.length !== initialLen) {
      this.saveItems(items);
      return true;
    }
    return false;
  },

  /**
   * 一键重置为初始精选校园数据（专供助教和测试人员反复评测）
   */
  resetToDefault() {
    this.saveItems(initialMockData);
    return [...initialMockData];
  }
};

// 兼容测试环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataManager, initialMockData };
}
