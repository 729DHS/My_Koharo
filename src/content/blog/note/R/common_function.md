---
title: R语言常用函数
link: R_functions
date: 2026-03-25 14:17:26
description: R语言常用函数
tags:
  - R
categories:
  - [笔记, R]
---

# Functionsk
## runif
runif(n,min,max)
n is the number.
## sample
sample(x,n,replace)
x is the range
n is the number
when n is bigger than the length of x, you should set replace = T.
```R
x <- sample(2:10,100,replace = T)
# the length is bigger,use repalce = T
```
## rnorm
```R
dnorm(x, mean = 0, sd = 1, log = FALSE)
pnorm(q, mean = 0, sd = 1, lower.tail = TRUE, log.p = FALSE)
qnorm(p, mean = 0, sd = 1, lower.tail = TRUE, log.p = FALSE)
rnorm(n, mean = 0, sd = 1)
```
* rnorm: normal distribution
n: number
mean: the center of the distribution
sd: the range near the center
> for example: rnorm(10,100,20) it means we select ten numbers between 80 and 120, the min is 100-20, max is 100+20.
## set seed()
设定随机数种子，便于复现
## hist() 频率直方图
hist receive a vector
it will draw a histogram to show the frequency of the data

```r
hist(x,freq = NULL, probability = !freq,
    right = TRUE,density = NULL, angle = 45, col = "lightgray",
    main = "Histogram of",
    xlim = range(breaks), ylim = NULL,
    xlab = xname,axes = TRUE, plot = TRUE, labels = FALSE,)
```
* freq: if T, display every values frequency, default is T,show the frequency instead of the density.
* probability: an alias for !freq, for S compatibility.
* right: if the data equal to the right side of range, it will beongs to this rnage.
* density: draw shading lines
* angle: the angle of the density
* col: the color of the histogram
* main: the title of the histogram
* xlim: the range of the x axis, when value = range(breaks),it will draw all the range of data, but if not, it will default to chose the range.
* ylim: the range of the y axis
* xlab: the label of the x axis
* ylab: the label of the y axis
* axes: if T, draw the x and y axis,default is T
* labels: default is F, show the value of the data on the histogram
## plot 散点图
plot function need two parameters as x,y , this function defualt draw points on the graph
```r
plot(x, y = NULL, type = "p", xlim = NULL, ylim = NULL, log = "",
    main = NULL, sub = NULL, xlab = NULL, ylab = NULL,
    ann = par("ann"), axes = TRUE, frame.plot = axes, panel.first = NULL,
    panel.last = NULL, bty = "o", ...)
```
* type: 
"p" for points,
"l" for lines,
"b" for both(lines and points),
"c" for the lines part alone of "b",
"o" for both ‘overplotted’,
"h" for ‘histogram’ like (or ‘high-density’) vertical lines,
"s" for stair steps,
"S" for other steps, see ‘Details’ below,
* cex: size of the points
* col: color
* pch: the shape of the points,19 is full
* xlim/ylim: xlim = c(min_x, max_x), decide the range of x/y
* log: log"x"/"xy": use log on x,y
* main: tittle
* sub: subtitle, down the pic
* bty: the type of the frame, "o" is the default line, "l" is no frame, "c" means double line
## text
用于给点或者决策树等添加文字
```R
text(x, y, label, pos = 3, offset = 0.5， cex = 1.5, srt = 45)
```
* label: the label vector
* cex: size of the label, default is 1
* pos: the position of the label
* offset: the distance between the label and the point
* srt: the angle of the label
## qq 图（Quantile-Quantile Plot）
geom_qq
qqplot
qqnrom
这三个方式做出来类似
```R
qqnorm(All$mark)
qqline(All$mark, col = 2)  # 添加一条理论正态分布的参考线，颜色设为红色
```
## abline
```R
abline(a = NULL, b = NULL, h = NULL, v = NULL, reg = NULL, coef = NULL,
    untf = FALSE, lty = 1, lwd = 1, col = "black", ...)
```
* a,b: a*x+b
* h,v: horizontal and vertical lines
* reg: regression line
* lty: line type
* lwd: line width
* col: colour

拟合示例：
```R
   data <- data.frame(x = 1:10, y = 2 * (1:10) + rnorm(10))
   plot(data$x, data$y)  # 绘制数据点
   model <- lm(y ~ x, data)  # 对数据进行线性拟合
   abline(model, col = "blue")  # 添加拟合线
```
## as.factor
usage: xxx <- as.factor(xxx)
use: change vector to factor
__what is factor?__
```r
# 创建一个简单的因子
fruit <- c("apple", "banana", "apple", "orange", "banana", "apple")
fruit_factor <- factor(fruit)

# 显示因子结构
fruit_factor

# 指定水平和标签
fruit_factor_labeled <- factor(fruit, levels = c("apple", "banana", "orange"), 
                               labels = c("Apple", "Banana", "Orange"))
fruit_factor_labeled
```
## summary  
得到拟合模型的参数
## colMeans
```R
average_marks <- colMeans(df2, na.rm = TRUE)
```
## colSums
```R
sum_marks <- colSums(df2, na.rm = TRUE)
```
## apply()
```R
median_marks <- apply(df2, 2, median, na.rm = TRUE)
#计算中位数
row_sums <- apply(mat, 1, sum)
#计算矩阵每一行的和
max_marks <- apply(df2, 2, max, na.rm = TRUE)
min_marks <- apply(df2, 2, min, na.rm = TRUE)
#计算最大最小
```
## tapply
```r
a <- c(2, 4, 1, 7, 6, 8, 3, 4)
c <- c("A", "A", "B", "B", "A", "A", "B", "B")
result <- tapply(a, c, mean)

d <- c("X", "Y", "X", "Y", "X", "Y", "X", "Y")
result <- tapply(a, list(c, d), mean)

tapply(vector, index, FUN, ..., default = NA, simplify = TRUE)
```
in the first example, variable in c vector defines which group the variable in a vector belongs to.
it will calculate the mean of each group such as A,B
## rep
```R
rep(x, times = NULL, each = NULL, length.out = NULL, along = NULL)
rep(1, times = 5) 
# 重复数字1，共5次
```
## lm
线性模型（lm()）、广义线性模型（glm()）、混合效应模型（lme()）
线性拟合
lm(y~x)
## lme
## glm
服从指数组分布
## gam
## cooks.distance
## boxplot  箱线图
* **x 和 y**：这是箱线图的基本数据，可以是向量、矩阵、数据框或列表。如果 x 是一个向量，那么 y 可以省略，此时 x 表示类别，y 表示对应的数值。
* **names.arg**：如果 x 是一个向量，可以使用 names.arg 来提供类别名称。
* **main**：设置图形的主标题。
* **xlab 和 ylab**：分别设置 X 轴和 Y 轴的标签。
* **las**：控制轴标签的方向，0 表示水平，1 表示垂直，2 表示旋转 45 度。
* **col 和 fill**：设置箱线的颜色和填充色。
* **border**：设置箱线边框的颜色。
* **outlier.col** 和 **outlier.pch**：设置异常值的点颜色和形状。
* **horizontal**：如果设为 TRUE，则绘制水平箱线图。
* **varwidth**：如果设为 TRUE，箱线的宽度将根据数据的样本量变化，否则所有箱线宽度相同。
* **notch**：如果设为 TRUE，箱线会有一个切口，表示 95%的置信区间，可用于比较中位数的显著性。
* **range**：控制须的长度，通常默认为 1.5 倍的四分位距（IQR）。
* **par**：可以传递图形参数，如 mar（边距）、 oma（外边距）等。
怎么看箱线图，箱线图主要用于描述数据的分布情况，其关键元素包括：
* 箱子（Box）：表示数据的下四分位数（Q1）和上四分位数（Q3），也就是数据的中间 50%。
* 中位数线（Median Line）：位于箱子内部的线，表示数据的中位数。
* 须（Whiskers）：从箱子两端延伸出去的线，通常表示数据的最小值（不包括异常值）和最大值，但不超过 Q1 减去 1.5 倍 IQR 和 Q3 加上 1.5 倍 IQR。
* 异常值（Outliers）：落在须之外的数据点，表示远离主要数据集的值。
## bwplot
## AIC
## fligner.test
检验方差齐性，得到 p-value，如果小于 0.05，拒绝原假设
## shapiro.test
检验数据是否遵循正态分布，得到值大于 0.05，则认为遵循正态分布
## cor.test
## durbinWatsonTest
Durbin-Watson 统计量是一个在 0 到 4 之间的数，用于评估模型的残差序列是否具有自相关性。数值接近 2 通常表示残差之间没有明显的自相关，而远离 2 则可能表明存在自相关
## dwtest()
```R
dwtest(object, alternative = c("two.sided", "less", "greater"), lag.max = NULL)
```
输出将包括 Durbin-Watson 统计量、对应的 p 值和检验结论。如果 p 值大于显著性水平（通常为 0.05），则不能拒绝原假设，即残差没有自相关性。反之，如果 p 值小于显著性水平，则可能需要对模型进行调整，以消除残差的自相关性。
## kruskal.test
## aov
## anova
## par(mfrow=c(x,y),cor = (1,1,2,2))
mfrow 定义图的阵列
cor 定义上下左右边框
## dotchart()
## pairs()
## panel.cor()
## tree()
```r
library(tree)
my_tree <- tree(response ~ ., data = dataset, control = tree.control(nnode = n))
plot(my_tree)
text(my_tree)
```
* response: 分类或回归问题的响应变量，对于分类问题，它应该是一个因子；对于回归问题，它应该是一个数值向量。
* .: 代表所有其他变量，即用所有的自变量来预测响应变量。
* data: 包含响应变量和自变量的数据框。
* control: 一个 tree.control 对象，用于设置构建决策树时的参数，如最大树深度 nnode 等。
## 参数检验
T 检验：

单样本 T 检验：检验一个样本的均值是否与已知总体均值有显著差异。
独立样本 T 检验（两样本 T 检验）：比较两个独立样本的均值差异是否显著。
配对样本 T 检验：比较配对数据（如同一对象处理前后的测量）的均值差异是否显著。
ANOVA（方差分析）：

一元方差分析：用于比较三个或以上独立样本的均值是否存在显著差异。
多元方差分析（MANOVA）：当因变量不止一个时，用于同时分析多个因变量的均值差异。
卡方检验（χ²检验）：

拟合优度检验：检验观察频数与期望频数之间是否存在显著差异。
独立性检验：分析两个分类变量是否独立。
同质性检验：检验多个样本的频率分布是否相同。
F 检验：

方差齐性检验：在进行 ANOVA 之前，检验各组方差是否相等。
方差分析中的 F 检验：ANOVA 中用于确定组间差异是否显著。
## interaction.plot
```R
interaction.plot(x.factor = mydata$Age.Group, 
                 trace.factor = mydata$Gender, 
                 response = mydata$Salary, 
                 type = "b", 
                 col = c("red", "blue"), 
                 leg.legend = c("Female", "Male"))
```
* x.factor：X 轴的因子变量，可以是一个因子变量或一个数值向量。
* trace.factor：Y 轴的因子变量，可以是一个因子变量或一个数值向量。
* response：响应变量，可以是一个数值向量。
* data: 数据框
* type: 类型
1. "l" 线型图
2. "b" 线型图和点型图
3. "p" 点型图
4. "o" 超越线图的点图。
5. "c" 直方图风格的线图
6. legend: 图例
## groupedData()
处理重复测量数据
## radarplot() 雷达图
```R
radarchart/radarchartcirc(df, axistype, seg, pty, pcol, plty, plwd, pdensity, pangle, pfcol,cglty, cglwd, cglcol, axislabcol, title, maxmin, na.itp, centerzero, vlabels, vlcex, caxislabels, calcex, paxislabels, palcex, ...)
```
* axislabcol: 轴标签的颜色。轴标签和数字的颜色，默认是"blue
* axistype:轴的类型，可以是 0 到 5 之间的数值。0 表示无轴标签，1 表示中心轴标签，2 表示围绕图表的轴标签，3 表示同时有中心和周边轴标签，4 是 1 的星号格式，5 是 3 的星号格式。默认是 0
* seg: 分段数，决定轴上的分割数量。
* pty: 多边形的类型（线型）,指定点符号的向量，默认是 16（闭合的圆圈）。如果不绘制数据点，应设置为 32。
* pcol: 多边形边缘的颜色,绘制数据的颜色代码向量，默认是 1:8，会重复使用
* plty: 多边形边缘的线型。绘制数据的线型向量，默认是 1:6，会重复使用
* plwd: 多边形边缘的线宽。
* pdensity: 可能用于控制点的密度，如果 pcol 用于点而不是线条。
* pangle: 可能用于控制点的角度分布，如果 pcol 用于点。
* pfcol: 多边形内部的填充颜色。pfcol = scales::alpha("#00AFBB", 0.5)；alpha() 函数的第二个参数是一个介于 0 和 1 之间的数值，表示颜色的透明度。0 表示完全透明，1 表示完全不透明。在这个例子中，0.5 表示半透明，所以最终的 pfcol 颜色是 50%透明的蓝色
* cglty: 网格线的线型。雷达网格的线型，默认是 3（虚线）。对于 radarchartcirc()，默认是 1（实线）
* cglwd: 网格线的线宽。雷达网格的线宽，默认是 1，表示最细的线宽
* cglcol: 网格线的颜色。雷达网格的颜色，默认是"navy"
* title: 图表的标题。maxmin: 可能用于控制最大最小值的显示。
* na.itp: 如何处理 NA 值。
* centerzero: 是否将图表中心设为 0。
* vlabels: 变量的标签，通常对应数据框的列名。
* vlcex: 变量标签的字体大小。
* caxislabels: 轴刻度标签。
* calcex: 刻度标签的字体大小。
* paxislabels: 多边形轴的标签。
* palcex: 多边形轴标签的字体大小。

## legend 图例
```R
legend(x, y, legend, fill = NULL, col = "black", bg = "white",
       lty = 1, lwd = 1, pch = 1, angle = 45, density = NULL, bty = "o",
       box.lwd = 1, box.col = "black", text.col = "black", 
       title = NULL, cex = 1, pt.bg = NA, pt.cex = 1, 
       xjust = 0, yjust = 1, xpd = NA, 
       ncol = 1, horiz = FALSE, title.adj = c(0.5, 0.5), ...)
```

