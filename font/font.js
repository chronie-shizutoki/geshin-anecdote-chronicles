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
                this.closeModal();
            });
        }
        
        // 点击恢复原始授权字体按钮
        if (this.restoreOriginalFontBtn) {
            this.restoreOriginalFontBtn.addEventListener('click', () => {
                // 存储用户偏好到localStorage
                localStorage.setItem('fontPreference', 'original');
                
                // 显示动画后再关闭弹窗并刷新页面
                this.closeModal(true);
            });
        }
        
        // 点击重新使用衍生字体按钮
        if (this.useDerivedFontBtn) {
            this.useDerivedFontBtn.addEventListener('click', () => {
                // 存储用户偏好到localStorage
                localStorage.setItem('fontPreference', 'derived');
                
                // 显示动画后再关闭弹窗并刷新页面
                this.closeModal(true);
            });
        }
        
        // 点击模态框外部区域关闭弹窗
        window.addEventListener('click', (event) => {
            if (event.target === this.fontLicenseModal) {
                this.closeModal();
            }
        });
    }
    
    // 关闭弹窗方法（带动画效果）
    closeModal(needReload = false) {
        const modalContent = this.fontLicenseModal.querySelector('.modal-content');
        
        // 添加关闭动画类
        this.fontLicenseModal.classList.add('fade-out');
        modalContent.classList.add('slide-out');
        
        // 动画结束后隐藏弹窗
        setTimeout(() => {
            this.fontLicenseModal.style.display = 'none';
            // 移除动画类，以便下次打开时重新触发动画
            this.fontLicenseModal.classList.remove('fade-out');
            modalContent.classList.remove('slide-out');
            
            // 如果需要重新加载页面
            if (needReload) {
                location.reload();
            }
        }, 300); // 与动画持续时间相同
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
                src: url("font/ipamjm.woff2");
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