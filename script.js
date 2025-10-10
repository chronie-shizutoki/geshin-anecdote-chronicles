// 引入角色汇总数据
import { characterData } from './data/data-zh-cn.js';

// 导出数据功能
const exportData = function() {
    const completedTasks = getCompletedTasks();
    const dataStr = JSON.stringify(completedTasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `geshin-anecdote-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// 导入数据功能
const importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            // 验证导入的数据结构
            if (typeof importedData === 'object') {
                localStorage.setItem('completedTasks', JSON.stringify(importedData));
                // 显示导入成功提示
                alert('数据导入成功！页面将刷新以显示最新数据。');
                // 刷新视图
                renderView();
            } else {
                alert('无效的数据格式！请确保导入的是正确的JSON文件。');
            }
        } catch (error) {
            alert('数据解析错误！请确保导入的是有效的JSON文件。');
            console.error('导入数据时出错:', error);
        }
    };
    reader.readAsText(file);
    // 重置文件输入，以便可以重复选择同一个文件
    event.target.value = '';
};

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载并显示前置弹窗
    loadPrePopup();
    
    // 渲染初始视图
    renderView();
    
    // 添加事件监听器
    addEventListeners();
    
    // 初始化回到顶部按钮
    initScrollTopButton();
    
    // 添加窗口大小变化监听器，实现响应式切换
    window.addEventListener('resize', renderView);
    
    // 为导出/导入按钮添加事件监听器
    document.getElementById('export-data')?.addEventListener('click', exportData);
    document.getElementById('import-data')?.addEventListener('change', importData);
    
    // 初始化未完成任务数量显示
    updateIncompleteCount();
    
    // 初始化任务计数显示
    updateTaskCounts();
});

// 加载并显示前置弹窗
function loadPrePopup() {
    // 获取弹窗元素
    const popup = document.getElementById('prePopup');
    const popupTitle = document.getElementById('prePopupTitle');
    const popupContent = document.getElementById('prePopupContent');
    const popupButton = document.getElementById('prePopupButton');
    
    // 检查是否存在弹窗元素
    if (!popup || !popupTitle || !popupContent || !popupButton) {
        console.error('无法找到弹窗元素');
        return;
    }
    
    // 检查用户是否已经关闭过弹窗（使用localStorage存储）
    const hasClosedPopup = localStorage.getItem('prePopupClosed');
    if (hasClosedPopup) {
        return; // 用户已经关闭过弹窗，不再显示
    }
    
    // 从JSON文件加载弹窗配置
    fetch('data/popup-config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载弹窗配置');
            }
            return response.json();
        })
        .then(config => {
            // 检查是否需要显示弹窗
            if (config.showPopup) {
                // 设置弹窗内容
                popupTitle.textContent = config.title || '通知';
                popupContent.textContent = config.content || '';
                popupButton.textContent = config.buttonText || '确定';
                
                // 显示弹窗，添加动画效果
                setTimeout(() => {
                    popup.classList.add('show');
                }, 100);
                
                // 添加按钮点击事件
                popupButton.addEventListener('click', function() {
                    // 隐藏弹窗，添加动画效果
                    popup.classList.remove('show');
                    
                    // 动画结束后完全隐藏
                    setTimeout(() => {
                        popup.style.display = 'none';
                    }, config.animationDuration || 300);
                    
                    // 记录用户已经关闭过弹窗
                    localStorage.setItem('prePopupClosed', 'true');
                });
            }
        })
        .catch(error => {
            console.error('加载弹窗配置时出错:', error);
        });
}

// 本地存储相关函数
function getCompletedTasks() {
    const stored = localStorage.getItem('completedTasks');
    return stored ? JSON.parse(stored) : {};
}
// 保存已完成任务
function saveCompletedTask(taskId, isCompleted) {
    const completedTasks = getCompletedTasks();
    completedTasks[taskId] = isCompleted;
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    
    // 更新未完成任务数量显示
    updateIncompleteCount();
}

// 根据设备宽度渲染对应视图
function renderView(filteredData = null) {
    const isMobile = window.innerWidth <= 768;
    const hasFilteredData = filteredData !== null && filteredData !== undefined;
    
    // 为主要内容区域创建或更新视图
    if (isMobile) {
        if (hasFilteredData) {
            renderCards(filteredData);
        } else {
            renderCards();
        }
    } else {
        if (hasFilteredData) {
            renderTable(filteredData);
        } else {
            renderTable();
        }
    }
}

// 在 DOM 加载完成后为新版本按钮添加点击事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const newVersionBtn = document.getElementById('new-version-btn');
    if (newVersionBtn) {
        newVersionBtn.addEventListener('click', function() {
            window.open('new-version.html', '_self');
        });
    }
});

// 在 DOM 加载完成后为反馈按钮添加点击事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const feedbackBtn = document.getElementById('feedback-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function() {
            window.open('https://wj.qq.com/s2/24219207/e16c/', '_blank');
        });
    }
});

// 计算未完成任务数量并更新显示
function updateIncompleteCount() {
    const completedTasks = getCompletedTasks();
    const incompleteCount = characterData.filter(item => !completedTasks[item.id]).length;
    const incompleteCountElement = document.getElementById('incomplete-count');
    if (incompleteCountElement) {
        incompleteCountElement.textContent = incompleteCount;
    }
}

// 更新总数和当前显示数量
function updateTaskCounts(filteredData = null) {
    // 更新总数
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = characterData.length;
    }
    
    // 更新当前显示数量
    const currentCountElement = document.getElementById('current-count');
    if (currentCountElement) {
        // 如果传入了已筛选的数据，直接使用其长度作为当前显示数量
        // 因为applyFilters已经处理了所有筛选条件
        const currentCount = filteredData ? filteredData.length : characterData.length;
        
        currentCountElement.textContent = currentCount;
    }
}

// 渲染主表格
function renderTable(filteredData = null) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    const data = filteredData || characterData;
    const completedTasks = getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    // 更新未完成任务数量显示
    updateIncompleteCount();
    
    // 更新总数和当前显示数量
    updateTaskCounts(filteredData);
    data.forEach(item => {
        // 应用仅显示未完成的筛选
        if (showOnlyIncomplete && completedTasks[item.id]) {
            return;
        }
        
        const row = document.createElement('tr');
        
        // 根据地区添加对应的样式类
        let regionClass = '';
        if (item.location.includes('蒙德')) regionClass = 'region-mondstadt';
        else if (item.location.includes('璃月')) regionClass = 'region-liyue';
        else if (item.location.includes('稻妻')) regionClass = 'region-inazuma';
        else if (item.location.includes('须弥')) regionClass = 'region-sumeru';
        else if (item.location.includes('枫丹')) regionClass = 'region-fontaine';
        else if (item.location.includes('纳塔')) regionClass = 'region-natlan';
        else if (item.location.includes('挪德')) regionClass = 'region-nordkala';
        
        row.className = regionClass;
        
        // 如果任务已完成，添加完成样式
        if (completedTasks[item.id]) {
            row.classList.add('completed-task');
        }
        
        // 完成状态复选框
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = completedTasks[item.id] || false;
        checkbox.addEventListener('change', function() {
            saveCompletedTask(item.id, this.checked);
            if (this.checked) {
                row.classList.add('completed-task');
            } else {
                row.classList.remove('completed-task');
            }
            // 如果启用了仅显示未完成，需要重新渲染表格
            if (document.getElementById('show-completed')?.checked) {
                renderTable(filteredData);
            }
        });
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        
        // 总计数
        const idCell = document.createElement('td');
        idCell.textContent = item.id;
        row.appendChild(idCell);
        
        // 角色
        const characterCell = document.createElement('td');
        characterCell.textContent = item.character;
        row.appendChild(characterCell);
        
        // 版本
        const versionCell = document.createElement('td');
        versionCell.textContent = item.version;
        row.appendChild(versionCell);
        
        // 游逸旅闻
        const travelCell = document.createElement('td');
        const travelSpan = document.createElement('span');
        travelSpan.textContent = item.travelName;
        if (item.isHidden) {
            travelSpan.className = 'hidden-travel';
        }
        travelCell.appendChild(travelSpan);
        row.appendChild(travelCell);
        
        // 地点
        const locationCell = document.createElement('td');
        locationCell.textContent = item.location;
        row.appendChild(locationCell);
        
        // 隐藏触发条件
        const conditionCell = document.createElement('td');
        conditionCell.textContent = item.hiddenCondition || '-';
        row.appendChild(conditionCell);
        
        // 额外出场角色
        const extraCell = document.createElement('td');
        extraCell.textContent = item.extraCharacter || '-';
        row.appendChild(extraCell);
        
        // 描述
        const descCell = document.createElement('td');
        descCell.textContent = item.description;
        row.appendChild(descCell);
        
        tableBody.appendChild(row);
    });
}

// 渲染主表格的卡片视图
function renderCards(filteredData = null) {
    const tableContainer = document.querySelector('.table-container');
    
    // 检查是否已有卡片容器，如果没有则创建
    let cardContainer = document.querySelector('.card-container');
    if (!cardContainer) {
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        tableContainer.appendChild(cardContainer);
    } else {
        cardContainer.innerHTML = '';
    }
    
    const data = filteredData || characterData;
    const completedTasks = getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    // 更新未完成任务数量显示
    updateIncompleteCount();
    
    // 更新总数和当前显示数量
    updateTaskCounts(filteredData);
    data.forEach(item => {
        // 应用仅显示未完成的筛选
        if (showOnlyIncomplete && completedTasks[item.id]) {
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'character-card';
        
        // 根据地区添加对应的样式类
        if (item.location.includes('蒙德')) card.classList.add('card-mondstadt');
        else if (item.location.includes('璃月')) card.classList.add('card-liyue');
        else if (item.location.includes('稻妻')) card.classList.add('card-inazuma');
        else if (item.location.includes('须弥')) card.classList.add('card-sumeru');
        else if (item.location.includes('枫丹')) card.classList.add('card-fontaine');
        else if (item.location.includes('纳塔')) card.classList.add('card-natlan');
        else if (item.location.includes('挪德')) card.classList.add('card-nordkala');
        
        // 如果任务已完成，添加完成样式
        if (completedTasks[item.id]) {
            card.classList.add('completed-task');
        }
        
        // 卡片标题
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const characterName = document.createElement('div');
        characterName.className = 'card-character';
        characterName.textContent = item.character;
        
        const versionTag = document.createElement('div');
        versionTag.className = 'card-version';
        versionTag.textContent = item.version;
        
        // 完成状态复选框
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'card-checkbox-container';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = completedTasks[item.id] || false;
        checkbox.addEventListener('change', function() {
            saveCompletedTask(item.id, this.checked);
            if (this.checked) {
                card.classList.add('completed-task');
            } else {
                card.classList.remove('completed-task');
            }
            // 如果启用了仅显示未完成，需要重新渲染卡片
            if (document.getElementById('show-completed')?.checked) {
                renderCards(filteredData);
            }
        });
        checkboxContainer.appendChild(checkbox);
        
        header.appendChild(characterName);
        header.appendChild(versionTag);
        header.appendChild(checkboxContainer);
        
        // 卡片内容
        const content = document.createElement('div');
        content.className = 'card-content';
        
        // 游逸旅闻和地点组合显示
        const travelLocationItem = document.createElement('div');
        travelLocationItem.className = 'card-item travel-location';
        
        const travelLocationValue = document.createElement('span');
        travelLocationValue.className = 'card-value';
        if (item.isHidden) travelLocationValue.classList.add('hidden-travel');
        travelLocationValue.textContent = `${item.travelName} ${item.location}`;
        
        travelLocationItem.appendChild(travelLocationValue);
        
        // 隐藏触发条件 - 只有当有内容时才显示
        const conditionItem = document.createElement('div');
        conditionItem.className = 'card-item condition-item';
        
        const conditionValue = document.createElement('span');
        conditionValue.className = 'card-value';
        conditionValue.innerHTML = `<strong>隐藏触发条件：</strong>${item.hiddenCondition || '-'}`;
        
        conditionItem.appendChild(conditionValue);
        
        // 额外出场角色 - 只有当有内容时才显示
        const extraItem = document.createElement('div');
        extraItem.className = 'card-item extra-item';
        
        const extraValue = document.createElement('span');
        extraValue.className = 'card-value';
        extraValue.innerHTML = `<strong>额外出场角色：</strong>${item.extraCharacter || '-'}`;
        
        extraItem.appendChild(extraValue);
        
        // 描述 - 限制一行，超出部分显示省略号，提供显示全部按钮
        const descItem = document.createElement('div');
        descItem.className = 'card-item description-item';
        
        const descContainer = document.createElement('div');
        descContainer.className = 'description-container';
        
        const descValue = document.createElement('span');
        descValue.className = 'card-value description-text';
        descValue.textContent = item.description;
        
        // 检查描述是否需要截断显示
        if (item.description.length > 12) {
            descValue.classList.add('truncated');
            
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.textContent = '展开';
            
            showMoreBtn.addEventListener('click', function() {
                descValue.classList.toggle('truncated');
                this.textContent = descValue.classList.contains('truncated') ? '展开' : '收起';
            });
            
            // 将按钮和文本都添加到一个内联容器中，使按钮显示在文本后面
            const inlineContainer = document.createElement('span');
            inlineContainer.appendChild(descValue);
            inlineContainer.appendChild(showMoreBtn);
            descContainer.appendChild(inlineContainer);
        } else {
            descContainer.appendChild(descValue);
        }
        
        descItem.appendChild(descContainer);
        
        // 组合卡片内容
        content.appendChild(travelLocationItem);
        
        // 只有当隐藏触发条件有内容时才添加
        if (item.hiddenCondition && item.hiddenCondition !== '-') {
            content.appendChild(conditionItem);
        }
        
        // 只有当额外出场角色有内容时才添加
        if (item.extraCharacter && item.extraCharacter !== '-') {
            content.appendChild(extraItem);
        }
        
        content.appendChild(descItem);
        
        // 组合卡片
        card.appendChild(header);
        card.appendChild(content);
        
        cardContainer.appendChild(card);
    });
}

// 引入自定义select初始化函数
import { initCustomSelectDisplay } from './components/select.js';

// 添加事件监听器
function addEventListeners() {
    const regionFilter = document.getElementById('region-filter');
    const versionFilter = document.getElementById('version-filter');
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-filter');
    const showCompletedCheckbox = document.getElementById('show-completed');
    
    // 地区筛选
    regionFilter.addEventListener('change', applyFilters);
    
    // 版本筛选
    versionFilter.addEventListener('change', applyFilters);
    
    // 搜索输入
    searchInput.addEventListener('input', applyFilters);
    
    // 仅显示未完成筛选
    showCompletedCheckbox.addEventListener('change', function() {
        applyFilters();
    });
    
    // 清除筛选
    clearButton.addEventListener('click', function() {
        regionFilter.value = 'all';
        versionFilter.value = 'all';
        searchInput.value = '';
        showCompletedCheckbox.checked = false;
        
        // 更新自定义select的UI显示
        initCustomSelectDisplay(regionFilter);
        initCustomSelectDisplay(versionFilter);
        
        renderView();
    });
}

// 应用筛选条件
function applyFilters() {
    const regionFilter = document.getElementById('region-filter').value;
    const versionFilter = document.getElementById('version-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    const completedTasks = getCompletedTasks();
    
    const filteredData = characterData.filter(item => {
        // 地区筛选
        const regionMatch = regionFilter === 'all' || item.location.includes(regionFilter);
        
        // 版本筛选
        const versionMatch = versionFilter === 'all' || item.version === versionFilter;
        
        // 搜索筛选
        const searchMatch = searchTerm === '' || 
                           item.character.toLowerCase().includes(searchTerm) ||
                           item.travelName.toLowerCase().includes(searchTerm) ||
                           item.description.toLowerCase().includes(searchTerm);
        
        // 未完成筛选
        const incompleteMatch = !showOnlyIncomplete || !completedTasks[item.id];
        
        return regionMatch && versionMatch && searchMatch && incompleteMatch;
    });
    
    renderView(filteredData);
}

// 初始化回到顶部按钮
function initScrollTopButton() {
    const scrollTopButton = document.querySelector('.scroll-top');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopButton.classList.add('visible');
        } else {
            scrollTopButton.classList.remove('visible');
        }
    });
    
    scrollTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// DOMContentLoaded事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化视图
    renderView();
    
    // 添加事件监听器
    addEventListeners();
    
    // 初始化回到顶部按钮
    initScrollTopButton();
    
    // 窗口大小变化时重新渲染视图
    window.addEventListener('resize', function() {
        renderView();
    });
    
    // 为更新日志按钮添加点击事件监听器
    const updateLogBtn = document.getElementById('update-log-btn');
    const updateLogModal = document.getElementById('update-log-modal');
    const updateLogClose = updateLogModal?.querySelector('.close');
    const updateLogContent = document.getElementById('update-log-content');
    
    if (updateLogBtn && updateLogModal && updateLogClose && updateLogContent) {
        // 显示弹窗
        updateLogBtn.addEventListener('click', function() {
            updateLogModal.style.display = 'block';
            // 加载更新日志内容
            loadUpdateLog();
        });
        
        // 关闭弹窗函数
        function closeModal(modal) {
            const modalContent = modal.querySelector('.modal-content');
            // 添加关闭动画类
            modal.classList.add('fade-out');
            modalContent.classList.add('slide-out');
            
            // 动画结束后隐藏弹窗
            setTimeout(() => {
                modal.style.display = 'none';
                // 移除动画类，以便下次打开时重新触发动画
                modal.classList.remove('fade-out');
                modalContent.classList.remove('slide-out');
            }, 300); // 与动画持续时间相同
        }
        
        // 关闭弹窗
        updateLogClose.addEventListener('click', function() {
            closeModal(updateLogModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === updateLogModal) {
                closeModal(updateLogModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && updateLogModal.style.display === 'block') {
                closeModal(updateLogModal);
            }
        });
    }
    
    // 加载更新日志内容
    function loadUpdateLog() {
        if (!updateLogContent) return;
        
        // 显示加载状态
        updateLogContent.innerHTML = '<p class="loading-indicator">加载中...</p>';
        
        // 使用fetch获取Markdown文件内容
        fetch('doc/update-log.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(markdown => {
                // 将Markdown转换为HTML
                const html = convertMarkdownToHtml(markdown);
                updateLogContent.innerHTML = html;
            })
            .catch(error => {
                console.error('加载更新日志失败:', error);
                updateLogContent.innerHTML = '<p class="error-message">加载更新日志失败，请刷新页面重试。</p>';
            });
    }
    
    // Markdown转HTML函数
    function convertMarkdownToHtml(markdown) {
    let html = markdown
        // 转换一级标题 (#) - 应该是h1而不是h3
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // 转换二级标题 (##) - 应该是h2而不是h4
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        // 转换三级标题 (###)
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        // 转换无序列表 (-)，先包装整个列表
        .replace(/(?:^-\s+(.+)(?:\n|$))+/gm, match => {
            const items = match.split('\n').filter(line => line.trim());
            const listItems = items.map(item => 
                item.replace(/^-\s+(.+)$/, '<li>$1</li>')
            ).join('');
            return `<ul>${listItems}</ul>`;
        })
        // 转换加粗文本 (**text**)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 处理单独的#号，转换为换行
        .replace(/^#$/gm, '<br>')
        // 处理段落 - 将连续的非空行作为段落
        .replace(/(.+?)(?:\r?\n|$)/g, '<p>$1</p>')
        // 清理空的段落
        .replace(/<p><\/p>/g, '')
        // 处理未转换的#号，转换为空格（放在最后避免影响前面的规则）
        .replace(/(?<!<[^>]*)#(?!\s)/g, ' ');

    return html;
}
});