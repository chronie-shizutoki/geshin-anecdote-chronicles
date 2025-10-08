// 自定义Select组件逻辑

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有需要自定义样式的select元素
    const selects = [
        document.getElementById('region-filter'),
        document.getElementById('version-filter')
    ];

    // 处理每个select元素
    selects.forEach(select => {
        if (!select) return;
        createCustomSelect(select);
    });

    // 为所有自定义select添加点击页面其他地方关闭下拉菜单的功能
    document.addEventListener('click', function(e) {
        closeAllSelect(e.target);
    });
});

/**
 * 创建自定义select组件
 * @param {HTMLElement} select - 原生select元素
 */
function createCustomSelect(select) {
    // 保存原生select的id
    const selectId = select.id;
    
    // 隐藏原生select
    select.style.display = 'none';
    
    // 创建自定义select容器
    const customSelect = document.createElement('div');
    customSelect.setAttribute('class', 'custom-select');
    select.parentNode.insertBefore(customSelect, select.nextSibling);
    
    // 创建选中项显示区域
    const selected = document.createElement('div');
    selected.setAttribute('class', 'select-selected');
    
    // 设置初始选中项文本
    const initialOption = select.options[select.selectedIndex];
    selected.textContent = initialOption.textContent;
    
    // 存储当前select的值
    selected.setAttribute('data-value', initialOption.value);
    
    customSelect.appendChild(selected);
    
    // 创建选项容器
    const itemsContainer = document.createElement('div');
    itemsContainer.setAttribute('class', 'select-items select-hide');
    customSelect.appendChild(itemsContainer);
    
    // 为每个选项创建自定义选项元素
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const item = document.createElement('div');
        item.textContent = option.textContent;
        item.setAttribute('data-value', option.value);
        
        // 为选中的选项添加特殊类
        if (i === select.selectedIndex) {
            item.setAttribute('class', 'same-as-selected');
        }
        
        // 添加选项点击事件
        item.addEventListener('click', function() {
            // 更新显示文本
            selected.textContent = this.textContent;
            selected.setAttribute('data-value', this.getAttribute('data-value'));
            
            // 更新原生select的值
            select.value = this.getAttribute('data-value');
            
            // 触发原生select的change事件
            const event = new Event('change', { 
                bubbles: true, 
                cancelable: true 
            });
            select.dispatchEvent(event);
            
            // 更新选项高亮状态
            const siblings = Array.from(itemsContainer.children);
            siblings.forEach(sibling => {
                sibling.classList.remove('same-as-selected');
            });
            this.classList.add('same-as-selected');
            
            // 关闭下拉菜单
            itemsContainer.classList.remove('select-show');
            selected.classList.remove('select-arrow-active');
        });
        
        itemsContainer.appendChild(item);
    }
    
    // 添加点击显示/隐藏下拉菜单的事件
    selected.addEventListener('click', function(e) {
        // 阻止事件冒泡
        e.stopPropagation();
        
        // 切换下拉菜单显示状态
        itemsContainer.classList.toggle('select-show');
        
        // 切换箭头旋转状态
        this.classList.toggle('select-arrow-active');
    });
}

/**
 * 关闭所有打开的下拉菜单
 * @param {HTMLElement} clickedElement - 点击的元素
 */
function closeAllSelect(clickedElement) {
    // 获取所有自定义select的显示区域和选项容器
    const selectedElements = document.getElementsByClassName('select-selected');
    const itemsContainers = document.getElementsByClassName('select-items');
    
    // 检查点击的元素是否在自定义select内部
    let clickedInsideCustomSelect = false;
    let currentSelectIndex = -1;
    
    for (let i = 0; i < selectedElements.length; i++) {
        if (clickedElement === selectedElements[i] || 
            selectedElements[i].contains(clickedElement) || 
            itemsContainers[i].contains(clickedElement)) {
            clickedInsideCustomSelect = true;
            currentSelectIndex = i;
            break;
        }
    }
    
    // 关闭所有下拉菜单
    for (let i = 0; i < selectedElements.length; i++) {
        // 如果点击的是当前select内部，则不关闭当前select的下拉菜单
        if (i === currentSelectIndex) continue;
        
        selectedElements[i].classList.remove('select-arrow-active');
        itemsContainers[i].classList.remove('select-show');
    }
}

/**
 * 初始化自定义select组件显示
 * @param {HTMLElement} select - 原生select元素
 */
function initCustomSelectDisplay(select) {
    if (!select) return;
    
    // 获取对应的自定义select显示区域
    const customSelect = select.nextElementSibling;
    if (!customSelect || !customSelect.classList.contains('custom-select')) {
        return;
    }
    
    const selected = customSelect.querySelector('.select-selected');
    const itemsContainer = customSelect.querySelector('.select-items');
    
    if (!selected || !itemsContainer) return;
    
    // 获取当前选中的选项
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption) {
        // 更新显示文本和值
        selected.textContent = selectedOption.textContent;
        selected.setAttribute('data-value', selectedOption.value);
        
        // 更新选项高亮状态
        const items = itemsContainer.querySelectorAll('div');
        items.forEach((item, index) => {
            if (index === select.selectedIndex) {
                item.classList.add('same-as-selected');
            } else {
                item.classList.remove('same-as-selected');
            }
        });
    }
}

// 导出函数以便在其他脚本中调用
export { initCustomSelectDisplay };