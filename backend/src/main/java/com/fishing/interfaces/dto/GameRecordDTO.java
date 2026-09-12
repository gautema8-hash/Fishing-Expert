package com.fishing.interfaces.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;
import java.io.Serializable;

/**
 * 游戏记录请求DTO
 *
 * @author 后端架构组
 */
@Data
public class GameRecordDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String gameType;

    @NotNull(message = "关卡不能为空")
    private Integer level;

    private Integer kills = 0;
    private Integer bossKills = 0;
    private Integer bulletsFired = 0;
    private Integer critCount = 0;
    private Long coinsEarned = 0L;
    private Long coinsSpent = 0L;
    private Integer duration = 0;
    private Long score = 0L;
    private Integer stars = 0;
}
