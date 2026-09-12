package com.fishing.interfaces.dto.admin;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * 通用分页结果
 *
 * @param <T> 列表元素类型
 * @author 后端架构组
 */
@Data
public class PageResult<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 数据列表
     */
    private List<T> list;

    /**
     * 总数
     */
    private long total;

    /**
     * 当前页码
     */
    private long page;

    /**
     * 每页大小
     */
    private long size;

    public PageResult() {
    }

    public PageResult(List<T> list, long total, long page, long size) {
        this.list = list;
        this.total = total;
        this.page = page;
        this.size = size;
    }
}
