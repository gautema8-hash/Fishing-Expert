package com.fishing.application.service;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fishing.common.exception.BusinessException;
import com.fishing.common.result.ResultCode;
import com.fishing.domain.model.Player;
import com.fishing.domain.repository.PlayerRepository;
import com.fishing.infrastructure.persistence.entity.GuildEntity;
import com.fishing.infrastructure.persistence.entity.GuildMemberEntity;
import com.fishing.infrastructure.persistence.repository.GuildMapper;
import com.fishing.infrastructure.persistence.repository.GuildMemberMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 公会应用服务
 *
 * @author 后端架构组
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuildAppService {

    private final GuildMapper guildMapper;
    private final GuildMemberMapper guildMemberMapper;
    private final PlayerRepository playerRepository;

    /**
     * 创建公会
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createGuild(String playerId, String guildName, String description) {
        // 检查是否已在公会
        GuildMemberEntity existingMember = guildMemberMapper.selectOne(
                new LambdaQueryWrapper<GuildMemberEntity>().eq(GuildMemberEntity::getPlayerId, playerId)
        );
        if (existingMember != null) {
            throw new BusinessException(ResultCode.ALREADY_IN_GUILD);
        }

        // 检查公会名是否重复
        GuildEntity existingGuild = guildMapper.selectOne(
                new LambdaQueryWrapper<GuildEntity>().eq(GuildEntity::getGuildName, guildName)
        );
        if (existingGuild != null) {
            throw new BusinessException("公会名称已存在");
        }

        // 创建公会
        String guildId = IdUtil.fastSimpleUUID();
        GuildEntity guild = new GuildEntity();
        guild.setGuildId(guildId);
        guild.setGuildName(guildName);
        guild.setLeaderId(playerId);
        guild.setGuildLevel(1);
        guild.setGuildExp(0L);
        guild.setMemberCount(1);
        guild.setMemberMax(20);
        guild.setDescription(description);
        guildMapper.insert(guild);

        // 添加会长
        GuildMemberEntity member = new GuildMemberEntity();
        member.setGuildId(guildId);
        member.setPlayerId(playerId);
        member.setRole("leader");
        member.setContribution(0L);
        member.setJoinedAt(LocalDateTime.now());
        guildMemberMapper.insert(member);

        Map<String, Object> result = new HashMap<>(4);
        result.put("guildId", guildId);
        result.put("guildName", guildName);
        return result;
    }

    /**
     * 加入公会
     */
    @Transactional(rollbackFor = Exception.class)
    public void joinGuild(String playerId, String guildId) {
        GuildEntity guild = guildMapper.selectOne(
                new LambdaQueryWrapper<GuildEntity>().eq(GuildEntity::getGuildId, guildId)
        );
        if (guild == null) {
            throw new BusinessException(ResultCode.GUILD_NOT_FOUND);
        }
        if (guild.getMemberCount() >= guild.getMemberMax()) {
            throw new BusinessException("公会成员已满");
        }

        GuildMemberEntity existingMember = guildMemberMapper.selectOne(
                new LambdaQueryWrapper<GuildMemberEntity>().eq(GuildMemberEntity::getPlayerId, playerId)
        );
        if (existingMember != null) {
            throw new BusinessException(ResultCode.ALREADY_IN_GUILD);
        }

        GuildMemberEntity member = new GuildMemberEntity();
        member.setGuildId(guildId);
        member.setPlayerId(playerId);
        member.setRole("member");
        member.setContribution(0L);
        member.setJoinedAt(LocalDateTime.now());
        guildMemberMapper.insert(member);

        guild.setMemberCount(guild.getMemberCount() + 1);
        guildMapper.updateById(guild);
    }

    /**
     * 退出公会
     */
    @Transactional(rollbackFor = Exception.class)
    public void leaveGuild(String playerId) {
        GuildMemberEntity member = guildMemberMapper.selectOne(
                new LambdaQueryWrapper<GuildMemberEntity>().eq(GuildMemberEntity::getPlayerId, playerId)
        );
        if (member == null) {
            throw new BusinessException("您不在任何公会中");
        }
        if ("leader".equals(member.getRole())) {
            throw new BusinessException("会长不能直接退出公会，请先转让会长");
        }

        guildMemberMapper.deleteById(member.getId());

        GuildEntity guild = guildMapper.selectOne(
                new LambdaQueryWrapper<GuildEntity>().eq(GuildEntity::getGuildId, member.getGuildId())
        );
        if (guild != null) {
            guild.setMemberCount(Math.max(0, guild.getMemberCount() - 1));
            guildMapper.updateById(guild);
        }
    }

    /**
     * 获取公会信息
     */
    public Map<String, Object> getGuildInfo(String playerId) {
        GuildMemberEntity member = guildMemberMapper.selectOne(
                new LambdaQueryWrapper<GuildMemberEntity>().eq(GuildMemberEntity::getPlayerId, playerId)
        );
        if (member == null) {
            return null;
        }

        GuildEntity guild = guildMapper.selectOne(
                new LambdaQueryWrapper<GuildEntity>().eq(GuildEntity::getGuildId, member.getGuildId())
        );

        List<GuildMemberEntity> members = guildMemberMapper.selectList(
                new LambdaQueryWrapper<GuildMemberEntity>()
                        .eq(GuildMemberEntity::getGuildId, member.getGuildId())
                        .orderByDesc(GuildMemberEntity::getContribution)
        );

        Map<String, Object> result = new HashMap<>(8);
        result.put("guild", guild);
        result.put("myRole", member.getRole());
        result.put("myContribution", member.getContribution());
        result.put("members", members);
        return result;
    }

    /**
     * 搜索公会
     */
    public List<GuildEntity> searchGuild(String keyword) {
        LambdaQueryWrapper<GuildEntity> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(GuildEntity::getGuildName, keyword);
        }
        wrapper.orderByDesc(GuildEntity::getGuildLevel);
        return guildMapper.selectList(wrapper);
    }
}
