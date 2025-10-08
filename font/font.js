// 字体授权设置相关功能
class FontManager {
    constructor() {
        // 获取DOM元素
        this.fontLicenseBtn = document.getElementById('font-license-btn');
        this.fontLicenseModal = document.getElementById('font-license-modal');
        this.closeBtn = this.fontLicenseModal?.querySelector('.close');
        this.restoreOriginalFontBtn = document.getElementById('restore-original-font');
        this.useDerivedFontBtn = document.getElementById('use-derived-font');
        
        // 初始化事件监听
        this.initEventListeners();
        
        // 检查用户之前的字体选择偏好
        this.checkFontPreference();
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 点击字体授权设置按钮显示弹窗
        if (this.fontLicenseBtn) {
            this.fontLicenseBtn.addEventListener('click', () => {
                this.fontLicenseModal.style.display = 'block';
            });
        }
        
        // 点击关闭按钮或模态框外部区域隐藏弹窗
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.fontLicenseModal.style.display = 'none';
            });
        }
        
        // 点击恢复原始授权字体按钮
        if (this.restoreOriginalFontBtn) {
            this.restoreOriginalFontBtn.addEventListener('click', () => {
                this.restoreOriginalFont();
            });
        }
        
        // 点击重新使用衍生字体按钮
        if (this.useDerivedFontBtn) {
            this.useDerivedFontBtn.addEventListener('click', () => {
                this.useDerivedFont();
            });
        }
        
        // 点击模态框外部区域关闭弹窗
        window.addEventListener('click', (event) => {
            if (event.target === this.fontLicenseModal) {
                this.fontLicenseModal.style.display = 'none';
            }
        });
    }
    
    // 恢复原始授权字体
    restoreOriginalFont() {
        // 存储用户偏好到localStorage
        localStorage.setItem('fontPreference', 'original');
        
        // 关闭模态框
        this.fontLicenseModal.style.display = 'none';
        
        // 重新加载页面以应用字体变更
        location.reload();
    }
    
    // 重新使用衍生字体
    useDerivedFont() {
        // 存储用户偏好到localStorage
        localStorage.setItem('fontPreference', 'derived');
        
        // 关闭模态框
        this.fontLicenseModal.style.display = 'none';
        
        // 重新加载页面以应用字体变更
        location.reload();
    }
    
    // 检查用户的字体偏好设置
    checkFontPreference() {
        const fontPreference = localStorage.getItem('fontPreference');
        
        // 如果用户选择了原始授权字体，则移除衍生字体的样式
        if (fontPreference === 'original') {
            this.disableDerivedFont();
        }
    }
    
    // 禁用衍生字体，使用原始授权字体
    disableDerivedFont() {
        // 创建一个新的style元素来覆盖font.css中的字体设置
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: "IPAMJM";
                src: url("font/ipamjm.ttf");
            }
            * {
                font-family: "IPAMJM" !important;
            }
            body {
                font-family: "IPAMJM", serif !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// 当DOM加载完成后初始化FontManager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FontManager();
    });
} else {
    // DOM已经加载完成
    new FontManager();
}