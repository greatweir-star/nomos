import json
import os

# 华为17个流程的L1-L4完整数据
processes_data = [
    {
        "id": "IPD",
        "name": "集成产品开发",
        "name_en": "Integrated Product Development",
        "category": "operating",
        "description": "将研发从'艺术'变为'科学'，通过结构化流程、跨部门团队协作和分阶段投资决策，实现商业成功。",
        "core_value": ["商业成功导向", "跨部门协同", "分阶段控风险", "重用与平台化"],
        "upstream": ["MTL", "DSTE"],
        "downstream": ["IPMS", "LTC", "Supply"],
        "level2": [
            {"id":"IPD-01","name":"概念阶段","description":"验证市场机会，定义产品包需求","checkpoints":["CDCP"],
             "level3":[
                {"id":"IPD-01-01","name":"市场机会分析","level4":[
                    {"id":"IPD-01-01-01","name":"细分市场定义","type":"hybrid","inputs":["行业趋势报告"],"outputs":["细分市场定义书"],"roles":["市场经理","产品经理"]},
                    {"id":"IPD-01-01-02","name":"客户痛点挖掘","type":"carbon","inputs":["客户名单"],"outputs":["客户痛点清单"],"roles":["客户经理","产品经理"]},
                    {"id":"IPD-01-01-03","name":"竞品对标分析","type":"silicon","inputs":["竞品清单"],"outputs":["竞品对标报告"],"roles":["竞品分析Agent"]},
                    {"id":"IPD-01-01-04","name":"市场规模测算","type":"hybrid","inputs":["市场数据"],"outputs":["市场规模测算表"],"roles":["市场经理","数据分析Agent"]}
                ]},
                {"id":"IPD-01-02","name":"需求定义","level4":[
                    {"id":"IPD-01-02-01","name":"产品包需求收集","type":"hybrid","inputs":["客户需求","销售反馈"],"outputs":["原始需求清单"],"roles":["需求工程师","需求收集Agent"]},
                    {"id":"IPD-01-02-02","name":"$APPEALS分析","type":"hybrid","inputs":["原始需求清单"],"outputs":["需求优先级矩阵"],"roles":["产品经理"]},
                    {"id":"IPD-01-02-03","name":"需求优先级排序","type":"carbon","inputs":["需求优先级矩阵"],"outputs":["需求基线"],"roles":["产品经理","研发代表","市场代表"]}
                ]},
                {"id":"IPD-01-03","name":"概念设计","level4":[
                    {"id":"IPD-01-03-01","name":"多概念方案生成","type":"hybrid","inputs":["需求基线"],"outputs":["概念方案集"],"roles":["系统工程师","创意Agent"]},
                    {"id":"IPD-01-03-02","name":"概念可行性评估","type":"hybrid","inputs":["概念方案集"],"outputs":["可行性评估报告"],"roles":["系统工程师","财务代表"]}
                ]},
                {"id":"IPD-01-04","name":"商业计划初稿","level4":[
                    {"id":"IPD-01-04-01","name":"商业论证起草","type":"hybrid","inputs":["市场规模","成本估算"],"outputs":["商业论证初稿"],"roles":["产品经理","财务代表","财务分析Agent"]},
                    {"id":"IPD-01-04-02","name":"风险评估","type":"hybrid","inputs":["商业论证初稿"],"outputs":["风险评估矩阵"],"roles":["项目经理","风险分析Agent"]}
                ]}
             ]},
            {"id":"IPD-02","name":"计划阶段","description":"细化需求，完成系统设计，制定详细计划","checkpoints":["PDCP"],
             "level3":[
                {"id":"IPD-02-01","name":"需求细化与分解","level4":[
                    {"id":"IPD-02-01-01","name":"需求分配到模块","type":"hybrid","inputs":["系统需求规格"],"outputs":["模块需求规格"],"roles":["系统工程师","模块负责人"]},
                    {"id":"IPD-02-01-02","name":"设计规格书制定","type":"carbon","inputs":["模块需求规格"],"outputs":["设计规格书"],"roles":["模块负责人"]}
                ]},
                {"id":"IPD-02-02","name":"系统设计","level4":[
                    {"id":"IPD-02-02-01","name":"系统架构设计","type":"carbon","inputs":["设计规格书"],"outputs":["系统架构文档"],"roles":["系统架构师"]},
                    {"id":"IPD-02-02-02","name":"接口定义","type":"carbon","inputs":["系统架构文档"],"outputs":["接口控制文档(ICD)"],"roles":["系统工程师"]},
                    {"id":"IPD-02-02-03","name":"DFX设计","type":"hybrid","inputs":["系统架构文档"],"outputs":["DFX检查清单"],"roles":["制造代表","服务代表"]}
                ]},
                {"id":"IPD-02-03","name":"项目计划制定","level4":[
                    {"id":"IPD-02-03-01","name":"WBS分解","type":"hybrid","inputs":["系统架构"],"outputs":["WBS"],"roles":["项目经理","计划Agent"]},
                    {"id":"IPD-02-03-02","name":"关键路径分析","type":"silicon","inputs":["WBS"],"outputs":["关键路径图"],"roles":["计划Agent"]}
                ]}
             ]},
            {"id":"IPD-03","name":"开发阶段","description":"完成详细设计、编码实现和模块验证","checkpoints":["TR3","TR4"],
             "level3":[
                {"id":"IPD-03-01","name":"详细设计","level4":[
                    {"id":"IPD-03-01-01","name":"模块详细设计","type":"carbon","inputs":["设计规格书"],"outputs":["详细设计文档"],"roles":["模块设计师"]},
                    {"id":"IPD-03-01-02","name":"测试方案设计","type":"hybrid","inputs":["详细设计文档"],"outputs":["测试方案"],"roles":["测试工程师","测试设计Agent"]}
                ]},
                {"id":"IPD-03-02","name":"编码实现","level4":[
                    {"id":"IPD-03-02-01","name":"软件开发","type":"hybrid","inputs":["详细设计文档"],"outputs":["代码"],"roles":["开发工程师","Coding Agent"]},
                    {"id":"IPD-03-02-02","name":"原型机试制","type":"carbon","inputs":["设计图纸"],"outputs":["原型机"],"roles":["硬件工程师","结构工程师"]}
                ]},
                {"id":"IPD-03-03","name":"模块验证","level4":[
                    {"id":"IPD-03-03-01","name":"单元测试","type":"silicon","inputs":["代码"],"outputs":["单元测试报告"],"roles":["测试Agent"]},
                    {"id":"IPD-03-03-02","name":"BBFV","type":"hybrid","inputs":["模块代码","测试方案"],"outputs":["BBFV报告"],"roles":["测试工程师","测试执行Agent"]}
                ]}
             ]},
            {"id":"IPD-04","name":"验证阶段","description":"完成Beta测试和量产验证","checkpoints":["TR5","TR6"],
             "level3":[
                {"id":"IPD-04-01","name":"Beta测试","level4":[
                    {"id":"IPD-04-01-01","name":"客户现场试用","type":"carbon","inputs":["Beta版本"],"outputs":["Beta测试报告"],"roles":["客户","技术支持"]},
                    {"id":"IPD-04-01-02","name":"用户体验验证","type":"hybrid","inputs":["Beta反馈"],"outputs":["UX优化建议"],"roles":["UX设计师","用户反馈分析Agent"]}
                ]},
                {"id":"IPD-04-02","name":"量产验证","level4":[
                    {"id":"IPD-04-02-01","name":"试产(Pilot Run)","type":"carbon","inputs":["量产图纸"],"outputs":["试产报告"],"roles":["制造工程师","质量工程师"]},
                    {"id":"IPD-04-02-02","name":"直通率验证","type":"silicon","inputs":["试产数据"],"outputs":["直通率报告"],"roles":["质量监控Agent"]}
                ]}
             ]},
            {"id":"IPD-05","name":"发布阶段","description":"产品正式上市","checkpoints":["ADCP"],
             "level3":[
                {"id":"IPD-05-01","name":"上市准备","level4":[
                    {"id":"IPD-05-01-01","name":"销售工具包制作","type":"hybrid","inputs":["产品规格"],"outputs":["销售工具包"],"roles":["市场经理","内容生成Agent"]},
                    {"id":"IPD-05-01-02","name":"供应链爬坡","type":"carbon","inputs":["试产数据"],"outputs":["产能达标确认"],"roles":["供应链经理","制造经理"]}
                ]}
             ]},
            {"id":"IPD-06","name":"生命周期管理","description":"产品上市后持续管理直到退市","checkpoints":["LDCP"],
             "level3":[
                {"id":"IPD-06-01","name":"生命周期维护","level4":[
                    {"id":"IPD-06-01-01","name":"版本迭代管理","type":"hybrid","inputs":["市场反馈","缺陷数据"],"outputs":["版本路线图"],"roles":["产品经理","需求分析Agent"]},
                    {"id":"IPD-06-01-02","name":"退市决策","type":"carbon","inputs":["销售数据","库存数据"],"outputs":["退市计划"],"roles":["产品总监","财务代表"]}
                ]}
             ]}
        ]
    },
    {
        "id": "MTL",
        "name": "市场到线索",
        "name_en": "Market to Lead",
        "category": "operating",
        "description": "将市场部变成'线索工厂'，通过系统化的市场洞察和营销活动，为销售持续输送高质量线索。",
        "upstream": ["DSTE", "IPD"],
        "downstream": ["LTC", "IPMS"],
        "level2": [
            {"id":"MTL-01","name":"市场洞察","description":"宏观分析、行业趋势、竞争情报、客户画像","level3":[
                {"id":"MTL-01-01","name":"宏观与行业分析","level4":[
                    {"id":"MTL-01-01-01","name":"政策与宏观环境扫描","type":"silicon","inputs":["公开政策数据"],"outputs":["宏观环境分析报告"],"roles":["市场情报Agent"]},
                    {"id":"MTL-01-01-02","name":"行业趋势研判","type":"hybrid","inputs":["行业报告","专家访谈"],"outputs":["行业趋势研判"],"roles":["行业分析师","情报分析Agent"]}
                ]},
                {"id":"MTL-01-02","name":"客户画像","level4":[
                    {"id":"MTL-01-02-01","name":"目标客户细分","type":"hybrid","inputs":["历史成交数据","市场数据"],"outputs":["客户细分模型"],"roles":["市场经理","数据分析Agent"]},
                    {"id":"MTL-01-02-02","name":"客户旅程地图绘制","type":"carbon","inputs":["客户访谈","行为数据"],"outputs":["客户旅程地图"],"roles":["UX研究员","市场经理"]}
                ]}
            ]},
            {"id":"MTL-02","name":"需求激发","description":"品牌传播、数字营销、活动营销、内容营销","level3":[
                {"id":"MTL-02-01","name":"品牌传播","level4":[
                    {"id":"MTL-02-01-01","name":"品牌定位与信息屋搭建","type":"carbon","inputs":["品牌战略","竞品分析"],"outputs":["品牌信息屋"],"roles":["品牌经理"]},
                    {"id":"MTL-02-01-02","name":"传播内容生产","type":"hybrid","inputs":["品牌信息屋"],"outputs":["传播内容素材"],"roles":["内容创作者","内容生成Agent"]}
                ]},
                {"id":"MTL-02-02","name":"数字营销","level4":[
                    {"id":"MTL-02-02-01","name":"SEM/SEO投放","type":"hybrid","inputs":["关键词库","预算"],"outputs":["投放数据报表"],"roles":["数字营销专员","投放优化Agent"]},
                    {"id":"MTL-02-02-02","name":"社交媒体运营","type":"hybrid","inputs":["内容日历"],"outputs":["社媒互动数据"],"roles":["社媒运营","内容发布Agent"]}
                ]},
                {"id":"MTL-02-03","name":"活动营销","level4":[
                    {"id":"MTL-02-03-01","name":"线上线下活动策划","type":"carbon","inputs":["营销目标","预算"],"outputs":["活动方案"],"roles":["活动经理"]},
                    {"id":"MTL-02-03-02","name":"活动执行与线索收集","type":"hybrid","inputs":["活动方案"],"outputs":["活动线索清单"],"roles":["活动执行","线索录入Agent"]}
                ]}
            ]},
            {"id":"MTL-03","name":"线索管理","description":"线索生成、评分、分发、转化追踪","level3":[
                {"id":"MTL-03-01","name":"线索生成","level4":[
                    {"id":"MTL-03-01-01","name":"多渠道线索捕获","type":"silicon","inputs":["官网/活动/社媒数据"],"outputs":["原始线索池"],"roles":["线索捕获Agent"]},
                    {"id":"MTL-03-01-02","name":"线索去重与清洗","type":"silicon","inputs":["原始线索池"],"outputs":["清洗后线索"],"roles":["数据清洗Agent"]}
                ]},
                {"id":"MTL-03-02","name":"线索评分","level4":[
                    {"id":"MTL-03-02-01","name":"BANT评分模型执行","type":"silicon","inputs":["清洗后线索"],"outputs":["线索评分结果"],"roles":["线索评分Agent"]},
                    {"id":"MTL-03-02-02","name":"MQL/SQL认定","type":"hybrid","inputs":["线索评分结果"],"outputs":["MQL/SQL名单"],"roles":["市场经理","销售经理"]}
                ]},
                {"id":"MTL-03-03","name":"线索分发","level4":[
                    {"id":"MTL-03-03-01","name":"线索分配规则执行","type":"silicon","inputs":["SQL名单","区域/行业规则"],"outputs":["分配结果"],"roles":["线索分配Agent"]},
                    {"id":"MTL-03-03-02","name":"销售接收确认","type":"carbon","inputs":["分配结果"],"outputs":["接收确认"],"roles":["销售代表"]}
                ]},
                {"id":"MTL-03-04","name":"线索转化追踪","level4":[
                    {"id":"MTL-03-04-01","name":"线索漏斗监控","type":"silicon","inputs":["线索状态数据"],"outputs":["漏斗报表"],"roles":["数据分析Agent"]},
                    {"id":"MTL-03-04-02","name":"ROI评估","type":"hybrid","inputs":["营销花费","成交数据"],"outputs":["营销ROI报告"],"roles":["市场经理","财务分析Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "LTC",
        "name": "线索到回款",
        "name_en": "Lead to Cash",
        "category": "operating",
        "description": "从签约那一刻锁定利润，通过铁三角协同实现线索转化、合同签订、交付验收、回款的全闭环。",
        "upstream": ["MTL", "IPD"],
        "downstream": ["ITR", "MCR"],
        "level2": [
            {"id":"LTC-01","name":"管理线索","description":"线索接收、验证、分配、转化策划","level3":[
                {"id":"LTC-01-01","name":"线索接收与确认","level4":[
                    {"id":"LTC-01-01-01","name":"MTL线索接收","type":"silicon","inputs":["MQL/SQL"],"outputs":["接收记录"],"roles":["线索接收Agent"]},
                    {"id":"LTC-01-01-02","name":"线索真实性验证","type":"hybrid","inputs":["线索信息"],"outputs":["验证结果"],"roles":["销售助理","线索验证Agent"]}
                ]},
                {"id":"LTC-01-02","name":"线索分配","level4":[
                    {"id":"LTC-01-02-01","name":"区域/行业匹配","type":"silicon","inputs":["线索属性","分配规则"],"outputs":["分配建议"],"roles":["分配Agent"]},
                    {"id":"LTC-01-02-02","name":"主管确认","type":"carbon","inputs":["分配建议"],"outputs":["最终分配"],"roles":["销售主管"]}
                ]},
                {"id":"LTC-01-03","name":"线索转化策划","level4":[
                    {"id":"LTC-01-03-01","name":"铁三角分工确认","type":"carbon","inputs":["线索信息"],"outputs":["分工方案"],"roles":["AR","SR","FR"]}
                ]}
            ]},
            {"id":"LTC-02","name":"管理机会点","description":"商机评估、方案设计、竞争分析、商业模式设计","checkpoints":["机会点评审"],
             "level3":[
                {"id":"LTC-02-01","name":"客户洞察与关系拓展","level4":[
                    {"id":"LTC-02-01-01","name":"决策链地图绘制","type":"hybrid","inputs":["客户信息","工商数据"],"outputs":["决策链地图"],"roles":["AR","情报Agent"]},
                    {"id":"LTC-02-01-02","name":"关键人关系建设","type":"carbon","inputs":["决策链地图"],"outputs":["关系评估"],"roles":["AR"]}
                ]},
                {"id":"LTC-02-02","name":"需求分析与方案设计","level4":[
                    {"id":"LTC-02-02-01","name":"需求深度访谈","type":"carbon","inputs":["初步需求"],"outputs":["详细需求文档"],"roles":["SR","AR"]},
                    {"id":"LTC-02-02-02","name":"差异化方案设计","type":"hybrid","inputs":["详细需求","产品资料"],"outputs":["解决方案"],"roles":["SR","方案生成Agent"]}
                ]},
                {"id":"LTC-02-03","name":"竞争分析","level4":[
                    {"id":"LTC-02-03-01","name":"竞品对标","type":"silicon","inputs":["竞品清单"],"outputs":["竞品对比表"],"roles":["竞品分析Agent"]},
                    {"id":"LTC-02-03-02","name":"赢单率评估","type":"hybrid","inputs":["竞争态势","历史数据"],"outputs":["赢单率预测"],"roles":["AR","预测Agent"]}
                ]},
                {"id":"LTC-02-04","name":"商业模式设计","level4":[
                    {"id":"LTC-02-04-01","name":"定价策略制定","type":"hybrid","inputs":["成本数据","竞品价格"],"outputs":["定价方案"],"roles":["商务经理","定价Agent"]},
                    {"id":"LTC-02-04-02","name":"付款条款设计","type":"carbon","inputs":["定价方案"],"outputs":["商务条款"],"roles":["商务经理","法务"]}
                ]},
                {"id":"LTC-02-05","name":"机会点评审","level4":[
                    {"id":"LTC-02-05-01","name":"立项评审","type":"carbon","inputs":["商机材料"],"outputs":["评审结论"],"roles":["销售决策委员会"]}
                ]}
            ]},
            {"id":"LTC-03","name":"管理投标/谈判","description":"投标策略、标书制作、投标评审、合同谈判","level3":[
                {"id":"LTC-03-01","name":"投标策略制定","level4":[
                    {"id":"LTC-03-01-01","name":"投标团队组建","type":"carbon","inputs":["招标信息"],"outputs":["团队名单"],"roles":["投标经理"]},
                    {"id":"LTC-03-01-02","name":"技术/商务策略","type":"carbon","inputs":["招标要求"],"outputs":["投标策略"],"roles":["SR","AR","投标经理"]}
                ]},
                {"id":"LTC-03-02","name":"标书制作","level4":[
                    {"id":"LTC-03-02-01","name":"技术方案书编写","type":"hybrid","inputs":["投标策略","产品资料"],"outputs":["技术标书"],"roles":["SR","文档生成Agent"]},
                    {"id":"LTC-03-02-02","name":"商务标书制作","type":"hybrid","inputs":["定价方案"],"outputs":["商务标书"],"roles":["商务经理","报价Agent"]},
                    {"id":"LTC-03-02-03","name":"法务审核","type":"hybrid","inputs":["标书草稿"],"outputs":["法务审核意见"],"roles":["法务专员","合同审查Agent"]}
                ]},
                {"id":"LTC-03-03","name":"投标评审","level4":[
                    {"id":"LTC-03-03-01","name":"重大投标决策","type":"carbon","inputs":["完整标书"],"outputs":["投标决策"],"roles":["投标决策委员会"]}
                ]},
                {"id":"LTC-03-04","name":"合同谈判","level4":[
                    {"id":"LTC-03-04-01","name":"技术条款谈判","type":"carbon","inputs":["技术标书"],"outputs":["技术协议"],"roles":["SR"]},
                    {"id":"LTC-03-04-02","name":"商务条款谈判","type":"carbon","inputs":["商务标书"],"outputs":["商务协议"],"roles":["AR","商务经理"]},
                    {"id":"LTC-03-04-03","name":"法务条款谈判","type":"carbon","inputs":["合同模板"],"outputs":["法务确认"],"roles":["法务专员"]}
                ]}
            ]},
            {"id":"LTC-04","name":"管理合同","description":"合同评审、签订、交底、变更管理","level3":[
                {"id":"LTC-04-01","name":"合同评审与签订","level4":[
                    {"id":"LTC-04-01-01","name":"多部门会签","type":"hybrid","inputs":["合同草稿"],"outputs":["会签意见"],"roles":["法务","财务","交付","会签Agent"]},
                    {"id":"LTC-04-01-02","name":"正式签订","type":"carbon","inputs":["会签完成合同"],"outputs":["正式合同"],"roles":["授权签字人"]}
                ]},
                {"id":"LTC-04-02","name":"合同交底","level4":[
                    {"id":"LTC-04-02-01","name":"关键条款移交","type":"hybrid","inputs":["正式合同"],"outputs":["交底记录"],"roles":["AR","FR","交底Agent"]}
                ]},
                {"id":"LTC-04-03","name":"合同变更管理","level4":[
                    {"id":"LTC-04-03-01","name":"变更申请","type":"hybrid","inputs":["变更需求"],"outputs":["变更申请单"],"roles":["AR","变更评估Agent"]},
                    {"id":"LTC-04-03-02","name":"变更审批","type":"carbon","inputs":["变更申请单"],"outputs":["变更批准"],"roles":["变更审批委员会"]}
                ]}
            ]},
            {"id":"LTC-05","name":"管理交付","description":"交付准备、执行、验收","level3":[
                {"id":"LTC-05-01","name":"交付准备","level4":[
                    {"id":"LTC-05-01-01","name":"项目启动","type":"carbon","inputs":["合同"],"outputs":["项目启动会纪要"],"roles":["FR","项目经理"]},
                    {"id":"LTC-05-01-02","name":"交付计划制定","type":"hybrid","inputs":["合同要求"],"outputs":["交付计划"],"roles":["FR","计划Agent"]}
                ]},
                {"id":"LTC-05-02","name":"交付执行","level4":[
                    {"id":"LTC-05-02-01","name":"里程碑跟踪","type":"silicon","inputs":["交付计划","实际进度"],"outputs":["进度报表"],"roles":["进度监控Agent"]},
                    {"id":"LTC-05-02-02","name":"客户验收","type":"carbon","inputs":["交付物"],"outputs":["验收报告"],"roles":["FR","客户"]}
                ]}
            ]},
            {"id":"LTC-06","name":"管理回款","description":"开票、收款、逾期管理、项目关闭","level3":[
                {"id":"LTC-06-01","name":"开票与收款","level4":[
                    {"id":"LTC-06-01-01","name":"发票开具","type":"hybrid","inputs":["合同条款","交付里程碑"],"outputs":["发票"],"roles":["财务专员","开票Agent"]},
                    {"id":"LTC-06-01-02","name":"付款跟踪","type":"silicon","inputs":["发票","合同付款条款"],"outputs":["付款状态"],"roles":["回款跟踪Agent"]}
                ]},
                {"id":"LTC-06-02","name":"逾期管理","level4":[
                    {"id":"LTC-06-02-01","name":"催收提醒","type":"silicon","inputs":["逾期清单"],"outputs":["催收通知"],"roles":["催收Agent"]},
                    {"id":"LTC-06-02-02","name":"争议解决","type":"carbon","inputs":["争议详情"],"outputs":["解决方案"],"roles":["AR","法务"]}
                ]},
                {"id":"LTC-06-03","name":"项目关闭","level4":[
                    {"id":"LTC-06-03-01","name":"财务结算","type":"hybrid","inputs":["回款记录"],"outputs":["结算报告"],"roles":["财务专员","结算Agent"]},
                    {"id":"LTC-06-03-02","name":"经验总结","type":"carbon","inputs":["项目全过程数据"],"outputs":["项目总结报告"],"roles":["FR","AR"]}
                ]}
            ]}
        ]
    }
]

# 补充剩余14个流程（简化但保证L4）
remaining = [
    {
        "id": "ITR",
        "name": "问题到解决",
        "category": "operating",
        "description": "售后从成本中心变价值中心，通过快速响应和根因分析提升客户满意度。",
        "upstream": ["LTC", "IPD"],
        "downstream": ["IPD", "MCR"],
        "level2": [
            {"id":"ITR-01","name":"问题受理","level3":[
                {"id":"ITR-01-01","name":"多渠道接入","level4":[
                    {"id":"ITR-01-01-01","name":"工单自动创建","type":"silicon","inputs":["客户反馈"],"outputs":["工单"],"roles":["工单创建Agent"]},
                    {"id":"ITR-01-01-02","name":"问题分级","type":"silicon","inputs":["工单内容"],"outputs":["优先级标签"],"roles":["分级Agent"]}
                ]},
                {"id":"ITR-01-02","name":"评审分派","level4":[
                    {"id":"ITR-01-02-01","name":"技术评审","type":"hybrid","inputs":["工单"],"outputs":["评审结论"],"roles":["技术支持","分类Agent"]},
                    {"id":"ITR-01-02-02","name":"工单派发","type":"silicon","inputs":["评审结论"],"outputs":["派发结果"],"roles":["派发Agent"]}
                ]}
            ]},
            {"id":"ITR-02","name":"跟踪处理","level3":[
                {"id":"ITR-02-01","name":"一线快速解决","level4":[
                    {"id":"ITR-02-01-01","name":"知识库自动匹配","type":"silicon","inputs":["问题描述"],"outputs":["推荐方案"],"roles":["知识库Agent"]},
                    {"id":"ITR-02-01-02","name":"一线处理","type":"hybrid","inputs":["推荐方案"],"outputs":["处理结果"],"roles":["一线工程师"]}
                ]},
                {"id":"ITR-02-02","name":"二线疑难攻克","level4":[
                    {"id":"ITR-02-02-01","name":"专家会诊","type":"carbon","inputs":["疑难工单"],"outputs":["解决方案"],"roles":["技术专家"]}
                ]},
                {"id":"ITR-02-03","name":"三线研发修复","level4":[
                    {"id":"ITR-02-03-01","name":"缺陷定位","type":"hybrid","inputs":["问题日志"],"outputs":["根因分析"],"roles":["研发工程师","日志分析Agent"]},
                    {"id":"ITR-02-03-02","name":"补丁开发","type":"hybrid","inputs":["根因分析"],"outputs":["补丁"],"roles":["研发工程师","代码生成Agent"]}
                ]}
            ]},
            {"id":"ITR-03","name":"验证关闭","level3":[
                {"id":"ITR-03-01","name":"客户确认","level4":[
                    {"id":"ITR-03-01-01","name":"满意度回访","type":"silicon","inputs":["解决记录"],"outputs":["满意度评分"],"roles":["回访Agent"]}
                ]},
                {"id":"ITR-03-02","name":"知识沉淀","level4":[
                    {"id":"ITR-03-02-01","name":"问题库更新","type":"silicon","inputs":["工单全记录"],"outputs":["新问题条目"],"roles":["知识库Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "CRS",
        "name": "渠道零售服务",
        "category": "operating",
        "description": "让渠道像复制终端门店一样简单。",
        "upstream": ["IPMS", "LTC"],
        "downstream": ["MCR", "ITR"],
        "level2": [
            {"id":"CRS-01","name":"渠道策略","level3":[
                {"id":"CRS-01-01","name":"渠道模式设计","level4":[
                    {"id":"CRS-01-01-01","name":"渠道架构规划","type":"carbon","inputs":["市场数据"],"outputs":["渠道架构图"],"roles":["渠道总监"]},
                    {"id":"CRS-01-01-02","name":"渠道政策制定","type":"hybrid","inputs":["渠道架构"],"outputs":["渠道政策手册"],"roles":["渠道经理","政策Agent"]}
                ]}
            ]},
            {"id":"CRS-02","name":"伙伴招募与管理","level3":[
                {"id":"CRS-02-01","name":"代理商认证","level4":[
                    {"id":"CRS-02-01-01","name":"资质审核","type":"hybrid","inputs":["申请材料"],"outputs":["审核结果"],"roles":["渠道经理","审核Agent"]},
                    {"id":"CRS-02-01-02","name":"分级评估","type":"silicon","inputs":["历史业绩"],"outputs":["分级结果"],"roles":["评估Agent"]}
                ]}
            ]},
            {"id":"CRS-03","name":"门店运营","level3":[
                {"id":"CRS-03-01","name":"选址规划","level4":[
                    {"id":"CRS-03-01-01","name":"选址评估","type":"hybrid","inputs":["人流数据","商圈分析"],"outputs":["选址报告"],"roles":["选址专员","数据分析Agent"]}
                ]},
                {"id":"CRS-03-02","name":"陈列标准","level4":[
                    {"id":"CRS-03-02-01","name":"陈列方案设计","type":"hybrid","inputs":["产品清单"],"outputs":["陈列方案"],"roles":["陈列设计师","设计Agent"]}
                ]}
            ]},
            {"id":"CRS-04","name":"考核激励","level3":[
                {"id":"CRS-04-01","name":"销售目标分解","level4":[
                    {"id":"CRS-04-01-01","name":"目标自动分解","type":"silicon","inputs":["总目标","渠道能力"],"outputs":["分解目标"],"roles":["目标分解Agent"]}
                ]},
                {"id":"CRS-04-02","name":"返利政策","level4":[
                    {"id":"CRS-04-02-01","name":"返利计算","type":"silicon","inputs":["销售数据","返利规则"],"outputs":["返利金额"],"roles":["返利计算Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "DSTE",
        "name": "开发战略到执行",
        "category": "enabling",
        "description": "战略从董事会下到每个人的肩上。",
        "upstream": [],
        "downstream": ["IPD", "MTL", "LTC", "MHR", "MF"],
        "level2": [
            {"id":"DSTE-01","name":"战略制定","level3":[
                {"id":"DSTE-01-01","name":"BLM模型应用","level4":[
                    {"id":"DSTE-01-01-01","name":"市场洞察(五看)","type":"hybrid","inputs":["市场数据","竞争情报"],"outputs":["市场洞察报告"],"roles":["战略部","情报分析Agent"]},
                    {"id":"DSTE-01-01-02","name":"战略意图对齐","type":"carbon","inputs":["市场洞察"],"outputs":["战略意图"],"roles":["CEO","高管团队"]}
                ]}
            ]},
            {"id":"DSTE-02","name":"战略解码","level3":[
                {"id":"DSTE-02-01","name":"BEM模型应用","level4":[
                    {"id":"DSTE-02-01-01","name":"战略地图绘制","type":"hybrid","inputs":["战略意图"],"outputs":["战略地图"],"roles":["战略部","地图绘制Agent"]},
                    {"id":"DSTE-02-01-02","name":"KPI分解","type":"hybrid","inputs":["战略地图"],"outputs":["组织KPI"],"roles":["HRBP","分解Agent"]}
                ]}
            ]},
            {"id":"DSTE-03","name":"年度经营计划","level3":[
                {"id":"DSTE-03-01","name":"预算编制","level4":[
                    {"id":"DSTE-03-01-01","name":"部门预算申报","type":"hybrid","inputs":["KPI","历史预算"],"outputs":["部门预算"],"roles":["部门负责人","预算Agent"]},
                    {"id":"DSTE-03-01-02","name":"预算平衡","type":"carbon","inputs":["部门预算"],"outputs":["公司预算"],"roles":["CFO","预算委员会"]}
                ]}
            ]},
            {"id":"DSTE-04","name":"执行监控","level3":[
                {"id":"DSTE-04-01","name":"经营分析会","level4":[
                    {"id":"DSTE-04-01-01","name":"数据自动汇总","type":"silicon","inputs":["各系统数据"],"outputs":["经营报表"],"roles":["数据汇总Agent"]},
                    {"id":"DSTE-04-01-02","name":"红黄绿灯预警","type":"silicon","inputs":["经营报表","预算"],"outputs":["预警清单"],"roles":["预警Agent"]},
                    {"id":"DSTE-04-01-03","name":"偏差纠正","type":"carbon","inputs":["预警清单"],"outputs":["Action Plan"],"roles":["经营团队"]}
                ]}
            ]},
            {"id":"DSTE-05","name":"战略评估复盘","level3":[
                {"id":"DSTE-05-01","name":"年度复盘","level4":[
                    {"id":"DSTE-05-01-01","name":"复盘报告生成","type":"hybrid","inputs":["全年数据"],"outputs":["复盘报告"],"roles":["战略部","报告生成Agent"]},
                    {"id":"DSTE-05-01-02","name":"战略调整决策","type":"carbon","inputs":["复盘报告"],"outputs":["战略调整"],"roles":["董事会"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MCR",
        "name": "管理客户关系",
        "category": "enabling",
        "description": "客户关系从个人交情变成组织资产。",
        "upstream": ["DSTE"],
        "downstream": ["LTC", "ITR"],
        "level2": [
            {"id":"MCR-01","name":"客户策略","level3":[
                {"id":"MCR-01-01","name":"客户分级分类","level4":[
                    {"id":"MCR-01-01-01","name":"ABC分级","type":"hybrid","inputs":["交易数据","潜力评估"],"outputs":["客户分级表"],"roles":["客户经理","分级Agent"]},
                    {"id":"MCR-01-01-02","name":"客户价值评估","type":"silicon","inputs":["历史数据"],"outputs":["价值评分"],"roles":["价值评估Agent"]}
                ]}
            ]},
            {"id":"MCR-02","name":"客户规划","level3":[
                {"id":"MCR-02-01","name":"年度接触计划","level4":[
                    {"id":"MCR-02-01-01","name":"接触计划制定","type":"carbon","inputs":["客户分级"],"outputs":["年度接触计划"],"roles":["客户经理"]}
                ]},
                {"id":"MCR-02-02","name":"决策链分析","level4":[
                    {"id":"MCR-02-02-01","name":"决策链地图","type":"hybrid","inputs":["客户信息"],"outputs":["决策链地图"],"roles":["AR","情报Agent"]}
                ]}
            ]},
            {"id":"MCR-03","name":"客户接触管理","level3":[
                {"id":"MCR-03-01","name":"拜访管理","level4":[
                    {"id":"MCR-03-01-01","name":"拜访前准备","type":"hybrid","inputs":["客户档案"],"outputs":["拜访提纲"],"roles":["AR","准备Agent"]},
                    {"id":"MCR-03-01-02","name":"拜访执行","type":"carbon","inputs":["拜访提纲"],"outputs":["拜访记录"],"roles":["AR"]},
                    {"id":"MCR-03-01-03","name":"拜访后归档","type":"silicon","inputs":["拜访记录"],"outputs":["更新档案"],"roles":["归档Agent"]}
                ]}
            ]},
            {"id":"MCR-04","name":"客户满意度管理","level3":[
                {"id":"MCR-04-01","name":"NPS调查","level4":[
                    {"id":"MCR-04-01-01","name":"问卷自动发送","type":"silicon","inputs":["客户清单"],"outputs":["问卷"],"roles":["调研Agent"]},
                    {"id":"MCR-04-01-02","name":"结果分析","type":"hybrid","inputs":["回收问卷"],"outputs":["NPS报告"],"roles":["客户成功","分析Agent"]}
                ]},
                {"id":"MCR-04-02","name":"问题闭环","level4":[
                    {"id":"MCR-04-02-01","name":"满意度问题跟踪","type":"silicon","inputs":["NPS报告"],"outputs":["跟踪工单"],"roles":["跟踪Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "Supply",
        "name": "供应/集成供应链",
        "category": "enabling",
        "description": "签了合同就能按时交货。",
        "upstream": ["IPD", "LTC"],
        "downstream": ["LTC", "ITR"],
        "level2": [
            {"id":"Supply-01","name":"需求预测","level3":[
                {"id":"Supply-01-01","name":"销售预测","level4":[
                    {"id":"Supply-01-01-01","name":"统计预测","type":"silicon","inputs":["历史销售数据"],"outputs":["统计预测结果"],"roles":["预测Agent"]},
                    {"id":"Supply-01-01-02","name":"协同预测(S&OP)","type":"carbon","inputs":["统计预测","销售计划"],"outputs":["共识预测"],"roles":["销售","供应链","财务"]}
                ]}
            ]},
            {"id":"Supply-02","name":"供应计划","level3":[
                {"id":"Supply-02-01","name":"主生产计划(MPS)","level4":[
                    {"id":"Supply-02-01-01","name":"MPS编制","type":"hybrid","inputs":["共识预测","产能约束"],"outputs":["MPS"],"roles":["计划员","计划Agent"]}
                ]},
                {"id":"Supply-02-02","name":"物料需求计划(MRP)","level4":[
                    {"id":"Supply-02-02-01","name":"MRP运算","type":"silicon","inputs":["MPS","BOM"],"outputs":["物料需求"],"roles":["MRP Agent"]}
                ]}
            ]},
            {"id":"Supply-03","name":"订单履行","level3":[
                {"id":"Supply-03-01","name":"可用量检查(ATP)","level4":[
                    {"id":"Supply-03-01-01","name":"ATP计算","type":"silicon","inputs":["库存","在途"],"outputs":["可承诺量"],"roles":["ATP Agent"]}
                ]},
                {"id":"Supply-03-02","name":"交付承诺(CTP)","level4":[
                    {"id":"Supply-03-02-01","name":"交付期计算","type":"silicon","inputs":["订单","产能"],"outputs":["承诺交期"],"roles":["CTP Agent"]}
                ]}
            ]},
            {"id":"Supply-04","name":"物流配送","level3":[
                {"id":"Supply-04-01","name":"仓储管理","level4":[
                    {"id":"Supply-04-01-01","name":"库存监控","type":"silicon","inputs":["实时库存"],"outputs":["库存报表"],"roles":["库存监控Agent"]}
                ]},
                {"id":"Supply-04-02","name":"运输调度","level4":[
                    {"id":"Supply-04-02-01","name":"路径优化","type":"silicon","inputs":["订单","运力"],"outputs":["运输计划"],"roles":["调度Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "Procurement",
        "name": "采购",
        "category": "enabling",
        "description": "成本竞争力长在流程里。",
        "upstream": ["Supply", "IPD"],
        "downstream": ["Supply", "MF"],
        "level2": [
            {"id":"Procurement-01","name":"采购策略","level3":[
                {"id":"Procurement-01-01","name":"物料分类","level4":[
                    {"id":"Procurement-01-01-01","name":"卡拉杰克矩阵应用","type":"hybrid","inputs":["支出数据","供应风险"],"outputs":["物料分类"],"roles":["采购经理","分类Agent"]}
                ]}
            ]},
            {"id":"Procurement-02","name":"供应商管理","level3":[
                {"id":"Procurement-02-01","name":"供应商认证","level4":[
                    {"id":"Procurement-02-01-01","name":"准入审核","type":"hybrid","inputs":["供应商资料"],"outputs":["审核报告"],"roles":["采购工程师","审核Agent"]}
                ]},
                {"id":"Procurement-02-02","name":"绩效评估","level4":[
                    {"id":"Procurement-02-02-01","name":"绩效打分","type":"silicon","inputs":["交付数据","质量数据"],"outputs":["绩效评分"],"roles":["评估Agent"]}
                ]}
            ]},
            {"id":"Procurement-03","name":"采购执行","level3":[
                {"id":"Procurement-03-01","name":"询比价","level4":[
                    {"id":"Procurement-03-01-01","name":"RFQ自动发送","type":"silicon","inputs":["采购需求"],"outputs":["报价单"],"roles":["RFQ Agent"]}
                ]},
                {"id":"Procurement-03-02","name":"合同签订","level4":[
                    {"id":"Procurement-03-02-01","name":"采购合同审批","type":"hybrid","inputs":["报价单"],"outputs":["采购合同"],"roles":["采购经理","审批Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "SD",
        "name": "服务交付",
        "category": "enabling",
        "description": "工程现场作业标准化。",
        "upstream": ["LTC"],
        "downstream": ["ITR"],
        "level2": [
            {"id":"SD-01","name":"工程准备","level3":[
                {"id":"SD-01-01","name":"现场勘测","level4":[
                    {"id":"SD-01-01-01","name":"勘测数据收集","type":"hybrid","inputs":["客户现场信息"],"outputs":["勘测报告"],"roles":["交付工程师","勘测Agent"]}
                ]},
                {"id":"SD-01-02","name":"施工计划","level4":[
                    {"id":"SD-01-02-01","name":"计划编制","type":"hybrid","inputs":["勘测报告"],"outputs":["施工计划"],"roles":["项目经理","计划Agent"]}
                ]}
            ]},
            {"id":"SD-02","name":"设备安装","level3":[
                {"id":"SD-02-01","name":"硬件安装","level4":[
                    {"id":"SD-02-01-01","name":"安装执行","type":"carbon","inputs":["安装手册"],"outputs":["安装记录"],"roles":["安装工程师"]}
                ]}
            ]},
            {"id":"SD-03","name":"工程验收","level3":[
                {"id":"SD-03-01","name":"客户验收","level4":[
                    {"id":"SD-03-01-01","name":"验收测试","type":"hybrid","inputs":["测试方案"],"outputs":["验收报告"],"roles":["交付工程师","测试Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MCI",
        "name": "管理资本投资",
        "category": "enabling",
        "description": "资本运作不再靠拍脑袋。",
        "upstream": ["DSTE", "MF"],
        "downstream": ["MF"],
        "level2": [
            {"id":"MCI-01","name":"投资决策","level3":[
                {"id":"MCI-01-01","name":"项目遴选","level4":[
                    {"id":"MCI-01-01-01","name":"项目评估","type":"hybrid","inputs":["商业计划"],"outputs":["评估报告"],"roles":["投资经理","评估Agent"]}
                ]}
            ]},
            {"id":"MCI-02","name":"并购整合","level3":[
                {"id":"MCI-02-01","name":"尽职调查","level4":[
                    {"id":"MCI-02-01-01","name":"DD执行","type":"hybrid","inputs":["标的公司资料"],"outputs":["DD报告"],"roles":["投行","法务","财务"]}
                ]}
            ]},
            {"id":"MCI-03","name":"融资管理","level3":[
                {"id":"MCI-03-01","name":"融资方案设计","level4":[
                    {"id":"MCI-03-01-01","name":"方案比选","type":"carbon","inputs":["资金需求"],"outputs":["融资方案"],"roles":["CFO","融资团队"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MHR",
        "name": "管理人力资源",
        "category": "supporting",
        "description": "人的管理从经验驱动转向制度驱动。",
        "upstream": ["DSTE"],
        "downstream": ["LTC", "IPD", "ITR"],
        "level2": [
            {"id":"MHR-01","name":"组织管理","level3":[
                {"id":"MHR-01-01","name":"组织架构设计","level4":[
                    {"id":"MHR-01-01-01","name":"架构方案设计","type":"carbon","inputs":["战略方向"],"outputs":["组织架构图"],"roles":["HRD","高管"]}
                ]},
                {"id":"MHR-01-02","name":"编制管理","level4":[
                    {"id":"MHR-01-02-01","name":"编制预算","type":"hybrid","inputs":["业务计划"],"outputs":["编制方案"],"roles":["HRBP","编制Agent"]}
                ]}
            ]},
            {"id":"MHR-02","name":"人才获取","level3":[
                {"id":"MHR-02-01","name":"招聘管理","level4":[
                    {"id":"MHR-02-01-01","name":"JD生成","type":"hybrid","inputs":["岗位需求"],"outputs":["JD"],"roles":["招聘专员","JD生成Agent"]},
                    {"id":"MHR-02-01-02","name":"简历筛选","type":"silicon","inputs":["JD","简历池"],"outputs":["匹配名单"],"roles":["简历筛选Agent"]},
                    {"id":"MHR-02-01-03","name":"面试安排","type":"silicon","inputs":["匹配名单"],"outputs":["面试日程"],"roles":["调度Agent"]},
                    {"id":"MHR-02-01-04","name":"面试评估","type":"carbon","inputs":["面试记录"],"outputs":["评估结论"],"roles":["面试官"]}
                ]}
            ]},
            {"id":"MHR-03","name":"绩效管理","level3":[
                {"id":"MHR-03-01","name":"目标设定(PBC)","level4":[
                    {"id":"MHR-03-01-01","name":"PBC制定","type":"hybrid","inputs":["组织KPI"],"outputs":["个人PBC"],"roles":["主管","员工","PBC Agent"]}
                ]},
                {"id":"MHR-03-02","name":"绩效辅导","level4":[
                    {"id":"MHR-03-02-01","name":"定期辅导","type":"carbon","inputs":["绩效数据"],"outputs":["辅导记录"],"roles":["主管"]}
                ]},
                {"id":"MHR-03-03","name":"绩效评价","level4":[
                    {"id":"MHR-03-03-01","name":"数据自动汇总","type":"silicon","inputs":["各系统数据"],"outputs":["绩效数据包"],"roles":["数据汇总Agent"]},
                    {"id":"MHR-03-03-02","name":"校准会","type":"carbon","inputs":["绩效数据包"],"outputs":["最终评级"],"roles":["管理团队"]}
                ]}
            ]},
            {"id":"MHR-04","name":"薪酬激励","level3":[
                {"id":"MHR-04-01","name":"薪酬结构设计","level4":[
                    {"id":"MHR-04-01-01","name":"市场对标","type":"hybrid","inputs":["市场薪酬数据"],"outputs":["薪酬宽带"],"roles":["薪酬经理","对标Agent"]}
                ]},
                {"id":"MHR-04-02","name":"奖金分配","level4":[
                    {"id":"MHR-04-02-01","name":"奖金计算","type":"silicon","inputs":["绩效评级","奖金规则"],"outputs":["奖金金额"],"roles":["奖金计算Agent"]}
                ]}
            ]},
            {"id":"MHR-05","name":"培训发展","level3":[
                {"id":"MHR-05-01","name":"培训需求分析","level4":[
                    {"id":"MHR-05-01-01","name":"差距分析","type":"hybrid","inputs":["能力模型","现状评估"],"outputs":["培训需求"],"roles":["培训经理","分析Agent"]}
                ]},
                {"id":"MHR-05-02","name":"课程设计与实施","level4":[
                    {"id":"MHR-05-02-01","name":"课程开发","type":"hybrid","inputs":["培训需求"],"outputs":["课程"],"roles":["内训师","课程Agent"]},
                    {"id":"MHR-05-02-02","name":"培训实施","type":"hybrid","inputs":["课程"],"outputs":["签到/考核记录"],"roles":["培训专员","学习平台Agent"]}
                ]},
                {"id":"MHR-05-03","name":"效果评估","level4":[
                    {"id":"MHR-05-03-01","name":"学习完成率跟踪","type":"silicon","inputs":["学习记录"],"outputs":["完成率报表"],"roles":["学习平台Agent"]},
                    {"id":"MHR-05-03-02","name":"岗位效率提升度量","type":"hybrid","inputs":["培训前后数据"],"outputs":["培训ROI"],"roles":["培训经理","分析Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MF",
        "name": "管理财经/集成财经服务",
        "category": "supporting",
        "description": "用数字管理公司。",
        "upstream": ["DSTE", "LTC"],
        "downstream": ["DSTE", "MCI"],
        "level2": [
            {"id":"MF-01","name":"预算管理","level3":[
                {"id":"MF-01-01","name":"年度预算","level4":[
                    {"id":"MF-01-01-01","name":"预算编制","type":"hybrid","inputs":["战略","历史数据"],"outputs":["年度预算"],"roles":["财务","预算Agent"]}
                ]},
                {"id":"MF-01-02","name":"滚动预测","level4":[
                    {"id":"MF-01-02-01","name":"预测更新","type":"silicon","inputs":["实际数据"],"outputs":["滚动预测"],"roles":["预测Agent"]}
                ]}
            ]},
            {"id":"MF-02","name":"会计核算","level3":[
                {"id":"MF-02-01","name":"总账","level4":[
                    {"id":"MF-02-01-01","name":"凭证自动生成","type":"silicon","inputs":["业务单据"],"outputs":["会计凭证"],"roles":["记账Agent"]}
                ]},
                {"id":"MF-02-02","name":"费用报销","level4":[
                    {"id":"MF-02-02-01","name":"发票OCR识别","type":"silicon","inputs":["发票影像"],"outputs":["结构化数据"],"roles":["OCR Agent"]},
                    {"id":"MF-02-02-02","name":"智能审单","type":"silicon","inputs":["报销单","政策"],"outputs":["审核结果"],"roles":["审单Agent"]}
                ]}
            ]},
            {"id":"MF-03","name":"资金管理","level3":[
                {"id":"MF-03-01","name":"现金流预测","level4":[
                    {"id":"MF-03-01-01","name":"预测模型运行","type":"silicon","inputs":["应收应付数据"],"outputs":["现金流预测"],"roles":["现金流Agent"]}
                ]}
            ]},
            {"id":"MF-04","name":"税务合规","level3":[
                {"id":"MF-04-01","name":"税务申报","level4":[
                    {"id":"MF-04-01-01","name":"申报数据准备","type":"silicon","inputs":["账务数据"],"outputs":["申报表"],"roles":["税务Agent"]}
                ]}
            ]},
            {"id":"MF-05","name":"项目财经","level3":[
                {"id":"MF-05-01","name":"项目四算","level4":[
                    {"id":"MF-05-01-01","name":"概算","type":"hybrid","inputs":["项目信息"],"outputs":["项目概算"],"roles":["项目财务","概算Agent"]},
                    {"id":"MF-05-01-02","name":"预算","type":"hybrid","inputs":["概算"],"outputs":["项目预算"],"roles":["项目财务"]},
                    {"id":"MF-05-01-03","name":"核算","type":"silicon","inputs":["实际支出"],"outputs":["项目核算"],"roles":["核算Agent"]},
                    {"id":"MF-05-01-04","name":"决算","type":"hybrid","inputs":["项目核算"],"outputs":["项目决算"],"roles":["项目财务","决算Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "BTIT",
        "name": "业务变革与IT",
        "category": "supporting",
        "description": "每次管理变革都能标准化再迭代。",
        "upstream": ["DSTE"],
        "downstream": ["所有流程"],
        "level2": [
            {"id":"BTIT-01","name":"变革项目管理","level3":[
                {"id":"BTIT-01-01","name":"变革规划","level4":[
                    {"id":"BTIT-01-01-01","name":"变革方案设计","type":"carbon","inputs":["战略需求"],"outputs":["变革方案"],"roles":["变革经理"]}
                ]},
                {"id":"BTIT-01-02","name":"变革推行","level4":[
                    {"id":"BTIT-01-02-01","name":"推行计划执行","type":"hybrid","inputs":["变革方案"],"outputs":["推行进度"],"roles":["变革团队","推行Agent"]}
                ]}
            ]},
            {"id":"BTIT-02","name":"流程管理","level3":[
                {"id":"BTIT-02-01","name":"流程规划","level4":[
                    {"id":"BTIT-02-01-01","name":"BPA维护","type":"hybrid","inputs":["业务需求"],"outputs":["流程架构更新"],"roles":["流程经理","架构Agent"]}
                ]},
                {"id":"BTIT-02-02","name":"流程优化","level4":[
                    {"id":"BTIT-02-02-01","name":"效率分析","type":"silicon","inputs":["流程运行数据"],"outputs":["瓶颈报告"],"roles":["流程分析Agent"]},
                    {"id":"BTIT-02-02-02","name":"优化方案设计","type":"hybrid","inputs":["瓶颈报告"],"outputs":["优化方案"],"roles":["流程经理","优化Agent"]}
                ]}
            ]},
            {"id":"BTIT-03","name":"系统建设","level3":[
                {"id":"BTIT-03-01","name":"需求分析","level4":[
                    {"id":"BTIT-03-01-01","name":"业务需求收集","type":"hybrid","inputs":["业务痛点"],"outputs":["需求规格"],"roles":["BA","需求Agent"]}
                ]},
                {"id":"BTIT-03-02","name":"开发测试","level4":[
                    {"id":"BTIT-03-02-01","name":"代码开发","type":"hybrid","inputs":["设计文档"],"outputs":["代码"],"roles":["开发工程师","Coding Agent"]},
                    {"id":"BTIT-03-02-02","name":"测试执行","type":"hybrid","inputs":["测试用例"],"outputs":["测试报告"],"roles":["测试工程师","测试Agent"]}
                ]}
            ]},
            {"id":"BTIT-04","name":"数据管理","level3":[
                {"id":"BTIT-04-01","name":"主数据管理","level4":[
                    {"id":"BTIT-04-01-01","name":"数据清洗","type":"silicon","inputs":["原始数据"],"outputs":["清洗后数据"],"roles":["数据清洗Agent"]}
                ]},
                {"id":"BTIT-04-02","name":"数据分析","level4":[
                    {"id":"BTIT-04-02-01","name":"报表自动生成","type":"silicon","inputs":["业务数据"],"outputs":["管理报表"],"roles":["报表Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MBS",
        "name": "管理基础支撑",
        "category": "supporting",
        "description": "后台工作标准化并纳入绩效。",
        "upstream": ["DSTE"],
        "downstream": ["所有流程"],
        "level2": [
            {"id":"MBS-01","name":"行政后勤","level3":[
                {"id":"MBS-01-01","name":"差旅管理","level4":[
                    {"id":"MBS-01-01-01","name":"差旅申请审批","type":"hybrid","inputs":["出差计划"],"outputs":["审批结果"],"roles":["员工","审批Agent"]},
                    {"id":"MBS-01-01-02","name":"机票酒店预订","type":"silicon","inputs":["审批结果"],"outputs":["预订确认"],"roles":["预订Agent"]}
                ]}
            ]},
            {"id":"MBS-02","name":"法务合规","level3":[
                {"id":"MBS-02-01","name":"合同审核","level4":[
                    {"id":"MBS-02-01-01","name":"合同初筛","type":"silicon","inputs":["合同文本"],"outputs":["风险点清单"],"roles":["合同审查Agent"]},
                    {"id":"MBS-02-01-02","name":"法务终审","type":"carbon","inputs":["风险点清单"],"outputs":["审核意见"],"roles":["法务专员"]}
                ]}
            ]},
            {"id":"MBS-03","name":"品牌公关","level3":[
                {"id":"MBS-03-01","name":"危机公关","level4":[
                    {"id":"MBS-03-01-01","name":"舆情监控","type":"silicon","inputs":["全网数据"],"outputs":["舆情报告"],"roles":["舆情监控Agent"]},
                    {"id":"MBS-03-01-02","name":"危机响应","type":"carbon","inputs":["舆情报告"],"outputs":["公关方案"],"roles":["公关总监"]}
                ]}
            ]}
        ]
    },
    {
        "id": "MQ",
        "name": "管理质量",
        "category": "supporting",
        "description": "质量是嵌入流程的内在基因。",
        "upstream": ["IPD", "Supply"],
        "downstream": ["ITR"],
        "level2": [
            {"id":"MQ-01","name":"质量战略与标准","level3":[
                {"id":"MQ-01-01","name":"质量体系搭建","level4":[
                    {"id":"MQ-01-01-01","name":"ISO认证维护","type":"hybrid","inputs":["标准要求"],"outputs":["认证证书"],"roles":["质量经理","认证Agent"]}
                ]}
            ]},
            {"id":"MQ-02","name":"研发质量","level3":[
                {"id":"MQ-02-01","name":"设计评审","level4":[
                    {"id":"MQ-02-01-01","name":"评审Checklist执行","type":"hybrid","inputs":["设计文档"],"outputs":["评审记录"],"roles":["质量工程师","评审Agent"]}
                ]}
            ]},
            {"id":"MQ-03","name":"供应链质量","level3":[
                {"id":"MQ-03-01","name":"来料检验","level4":[
                    {"id":"MQ-03-01-01","name":"IQC检验","type":"hybrid","inputs":["来料"],"outputs":["检验报告"],"roles":["IQC","检验Agent"]}
                ]}
            ]},
            {"id":"MQ-04","name":"质量改进","level3":[
                {"id":"MQ-04-01","name":"根因分析","level4":[
                    {"id":"MQ-04-01-01","name":"鱼骨图/5Why","type":"hybrid","inputs":["问题描述"],"outputs":["根因报告"],"roles":["质量工程师","分析Agent"]}
                ]},
                {"id":"MQ-04-02","name":"CAPA","level4":[
                    {"id":"MQ-04-02-01","name":"纠正预防措施","type":"hybrid","inputs":["根因报告"],"outputs":["CAPA报告"],"roles":["责任部门","跟踪Agent"]}
                ]}
            ]}
        ]
    },
    {
        "id": "IPMS",
        "name": "集成产品营销与销售",
        "category": "operating",
        "description": "华为消费者BG特有流程，整合MTL+LTC+GTM，聚焦产品规划到零售管理的完整闭环。",
        "upstream": ["IPD", "MTL"],
        "downstream": ["CRS", "LTC"],
        "level2": [
            {"id":"IPMS-01","name":"产品规划","level3":[
                {"id":"IPMS-01-01","name":"产品组合策略","level4":[
                    {"id":"IPMS-01-01-01","name":"SKU规划","type":"hybrid","inputs":["市场数据","技术能力"],"outputs":["SKU清单"],"roles":["产品总监","规划Agent"]}
                ]},
                {"id":"IPMS-01-02","name":"路标规划","level4":[
                    {"id":"IPMS-01-02-01","name":"年度路标制定","type":"carbon","inputs":["SKU清单"],"outputs":["产品路标"],"roles":["产品委员会"]}
                ]}
            ]},
            {"id":"IPMS-02","name":"营销规划","level3":[
                {"id":"IPMS-02-01","name":"品牌定位","level4":[
                    {"id":"IPMS-02-01-01","name":"品牌屋搭建","type":"carbon","inputs":["产品定位"],"outputs":["品牌信息屋"],"roles":["品牌总监"]}
                ]},
                {"id":"IPMS-02-02","name":"整合营销传播","level4":[
                    {"id":"IPMS-02-02-01","name":"Campaign策划","type":"hybrid","inputs":["品牌信息屋"],"outputs":["Campaign方案"],"roles":["市场经理","策划Agent"]}
                ]}
            ]},
            {"id":"IPMS-03","name":"GTM上市管理","level3":[
                {"id":"IPMS-03-01","name":"上市计划","level4":[
                    {"id":"IPMS-03-01-01","name":"上市日历制定","type":"hybrid","inputs":["产品路标"],"outputs":["上市日历"],"roles":["GTM经理","计划Agent"]}
                ]},
                {"id":"IPMS-03-02","name":"首销管理","level4":[
                    {"id":"IPMS-03-02-01","name":"首销数据监控","type":"silicon","inputs":["销售数据"],"outputs":["首销日报"],"roles":["数据监控Agent"]}
                ]}
            ]},
            {"id":"IPMS-04","name":"零售管理","level3":[
                {"id":"IPMS-04-01","name":"门店运营","level4":[
                    {"id":"IPMS-04-01-01","name":"店效分析","type":"silicon","inputs":["门店销售数据"],"outputs":["店效报表"],"roles":["零售分析Agent"]}
                ]},
                {"id":"IPMS-04-02","name":"价格与库存","level4":[
                    {"id":"IPMS-04-02-01","name":"价保管理","type":"silicon","inputs":["价格波动数据"],"outputs":["价保结算"],"roles":["价保Agent"]},
                    {"id":"IPMS-04-02-02","name":"库存健康度监控","type":"silicon","inputs":["库存数据"],"outputs":["库存预警"],"roles":["库存监控Agent"]}
                ]}
            ]}
        ]
    }
]

processes_data.extend(remaining)

# 添加关系图谱数据
relationships = {
    "l1_dependencies": [
        {"from": "DSTE", "to": "IPD", "type": "战略驱动", "data": "产品战略、投资方向"},
        {"from": "DSTE", "to": "MTL", "type": "战略驱动", "data": "市场战略、品牌方向"},
        {"from": "DSTE", "to": "MHR", "type": "战略驱动", "data": "组织目标、绩效体系"},
        {"from": "DSTE", "to": "MF", "type": "战略驱动", "data": "财务目标、预算"},
        {"from": "MTL", "to": "LTC", "type": "流程衔接", "data": "MQL/SQL线索"},
        {"from": "IPD", "to": "IPMS", "type": "流程衔接", "data": "产品包、上市建议"},
        {"from": "IPD", "to": "LTC", "type": "流程衔接", "data": "产品资料、销售工具包"},
        {"from": "IPD", "to": "Supply", "type": "流程衔接", "data": "产品BOM、产能需求"},
        {"from": "IPMS", "to": "CRS", "type": "流程衔接", "data": "渠道政策、零售标准"},
        {"from": "IPMS", "to": "LTC", "type": "流程衔接", "data": "定价策略、销售指引"},
        {"from": "LTC", "to": "ITR", "type": "流程衔接", "data": "客户信息、合同信息"},
        {"from": "LTC", "to": "Supply", "type": "流程衔接", "data": "订单、交付要求"},
        {"from": "LTC", "to": "MCR", "type": "流程衔接", "data": "客户接触记录"},
        {"from": "Supply", "to": "Procurement", "type": "流程衔接", "data": "物料需求"},
        {"from": "Supply", "to": "LTC", "type": "流程衔接", "data": "交付承诺、库存状态"},
        {"from": "MHR", "to": "LTC", "type": "能力支撑", "data": "销售团队、绩效激励"},
        {"from": "MHR", "to": "IPD", "type": "能力支撑", "data": "研发团队、任职资格"},
        {"from": "MF", "to": "LTC", "type": "能力支撑", "data": "信用评估、开票收款"},
        {"from": "MF", "to": "DSTE", "type": "能力支撑", "data": "财务数据、预算执行"},
        {"from": "BTIT", "to": "所有流程", "type": "系统支撑", "data": "IT系统、数据平台"},
        {"from": "MBS", "to": "所有流程", "type": "基础支撑", "data": "行政、法务、安全"},
        {"from": "MQ", "to": "IPD", "type": "质量内建", "data": "质量标准、评审标准"},
        {"from": "MQ", "to": "Supply", "type": "质量内建", "data": "来料标准、检验规范"},
        {"from": "ITR", "to": "IPD", "type": "反馈闭环", "data": "产品缺陷、改进需求"},
        {"from": "ITR", "to": "MCR", "type": "反馈闭环", "data": "客户满意度、服务体验"}
    ]
}

output = {
    "version": "1.0",
    "description": "华为业务流程架构 L1-L4 完整流程树，面向 Nomos 碳硅协同重构",
    "total_l1": len(processes_data),
    "categories": {
        "operating": {"name": "执行类", "description": "直接面向客户价值创造", "processes": [p["id"] for p in processes_data if p["category"] == "operating"]},
        "enabling": {"name": "使能类", "description": "为前线提供弹药和策略", "processes": [p["id"] for p in processes_data if p["category"] == "enabling"]},
        "supporting": {"name": "支撑类", "description": "保障公司长期稳定运转", "processes": [p["id"] for p in processes_data if p["category"] == "supporting"]}
    },
    "relationships": relationships,
    "processes": processes_data
}

# 统计信息
total_l2 = sum(len(p["level2"]) for p in processes_data)
total_l3 = sum(len(l2["level3"]) for p in processes_data for l2 in p["level2"])
total_l4 = sum(len(l3.get("level4", [])) for p in processes_data for l2 in p["level2"] for l3 in l2["level3"])

output["stats"] = {
    "l1_count": len(processes_data),
    "l2_count": total_l2,
    "l3_count": total_l3,
    "l4_count": total_l4,
    "total_nodes": len(processes_data) + total_l2 + total_l3 + total_l4
}

with open("huawei_process_tree.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"JSON generated: {output['stats']}")
