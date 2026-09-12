package com.fishing;

import com.fishing.common.result.Result;
import com.fishing.common.result.ResultCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 统一响应结果单元测试
 *
 * @author 测试组
 */
public class ResultTest {

    @Test
    public void testSuccessNoData() {
        Result<Void> result = Result.success();
        assertEquals(Integer.valueOf(200), result.getCode());
        assertEquals("操作成功", result.getMessage());
        assertNull(result.getData());
        assertNotNull(result.getTimestamp());
    }

    @Test
    public void testSuccessWithData() {
        String data = "test data";
        Result<String> result = Result.success(data);
        assertEquals(Integer.valueOf(200), result.getCode());
        assertEquals("操作成功", result.getMessage());
        assertEquals(data, result.getData());
    }

    @Test
    public void testSuccessWithMessageAndData() {
        Result<String> result = Result.success("自定义消息", "data");
        assertEquals(Integer.valueOf(200), result.getCode());
        assertEquals("自定义消息", result.getMessage());
        assertEquals("data", result.getData());
    }

    @Test
    public void testFailWithResultCode() {
        Result<Void> result = Result.fail(ResultCode.USER_NOT_FOUND);
        assertEquals(Integer.valueOf(1001), result.getCode());
        assertEquals("用户不存在", result.getMessage());
    }

    @Test
    public void testFailWithCodeAndMessage() {
        Result<Void> result = Result.fail(400, "参数错误");
        assertEquals(Integer.valueOf(400), result.getCode());
        assertEquals("参数错误", result.getMessage());
    }

    @Test
    public void testFailWithMessage() {
        Result<Void> result = Result.fail("自定义错误");
        assertEquals(Integer.valueOf(500), result.getCode());
        assertEquals("自定义错误", result.getMessage());
    }

    @Test
    public void testResultCodeEnum() {
        assertEquals(Integer.valueOf(200), ResultCode.SUCCESS.getCode());
        assertEquals("操作成功", ResultCode.SUCCESS.getMessage());
        assertEquals(Integer.valueOf(1004), ResultCode.COINS_INSUFFICIENT.getCode());
        assertEquals("金币不足", ResultCode.COINS_INSUFFICIENT.getMessage());
    }
}
