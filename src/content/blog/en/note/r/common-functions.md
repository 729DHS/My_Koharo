---
title: R Language Common Functions
link: r-functions
date: 2026-03-25 14:17:26
description: R language common functions
tags:
  - R
categories:
  - [笔记, R]
---

# Functions
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
Set random seed for reproducibility
## hist() Frequency Histogram
hist receives a vector
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
## plot Scatter Plot
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
"o" for both 'overplotted',
"h" for 'histogram' like (or 'high-density') vertical lines,
"s" for stair steps,
"S" for other steps, see 'Details' below,
* cex: size of the points
* col: color
* pch: the shape of the points,19 is full
* xlim/ylim: xlim = c(min_x, max_x), decide the range of x/y
* log: log"x"/"xy": use log on x,y
* main: tittle
* sub: subtitle, down the pic
* bty: the type of the frame, "o" is the default line, "l" is no frame, "c" means double line
## text
Used to add text to points or decision trees, etc.
```R
text(x, y, label, pos = 3, offset = 0.5， cex = 1.5, srt = 45)
```
* label: the label vector
* cex: size of the label, default is 1
* pos: the position of the label
* offset: the distance between the label and the point
* srt: the angle of the label
## qq Plot (Quantile-Quantile Plot)
geom_qq
qqplot
qqnrom
These three methods produce similar results
```R
qqnorm(All$mark)
qqline(All$mark, col = 2)  # Add a theoretical normal distribution reference line, color set to red
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

Fitting example:
```R
   data <- data.frame(x = 1:10, y = 2 * (1:10) + rnorm(10))
   plot(data$x, data$y)  # Plot data points
   model <- lm(y ~ x, data)  # Linear fitting on data
   abline(model, col = "blue")  # Add fitted line
```
## as.factor
usage: xxx <- as.factor(xxx)
use: change vector to factor
__what is factor?__
```r
# Create a simple factor
fruit <- c("apple", "banana", "apple", "orange", "banana", "apple")
fruit_factor <- factor(fruit)

# Display factor structure
fruit_factor

# Specify levels and labels
fruit_factor_labeled <- factor(fruit, levels = c("apple", "banana", "orange"),
                               labels = c("Apple", "Banana", "Orange"))
fruit_factor_labeled
```
## summary
Get parameters of fitted model
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
#calculate median
row_sums <- apply(mat, 1, sum)
#calculate sum of each row in matrix
max_marks <- apply(df2, 2, max, na.rm = TRUE)
min_marks <- apply(df2, 2, min, na.rm = TRUE)
#calculate max and min
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
# repeat the number 1,5 times in total
```
## lm
Linear model (lm()), Generalized linear model (glm()), Mixed effects model (lme())
Linear fitting
lm(y~x)
## lme
## glm
Subject to exponential family distribution
## gam
## cooks.distance
## boxplot Box Plot
* **x and y**: These are the basic data for the box plot, can be vectors, matrices, data frames, or lists. If x is a vector, y can be omitted, in which case x represents categories and y represents corresponding values.
* **names.arg**: If x is a vector, you can use names.arg to provide category names.
* **main**: Set the main title of the graph.
* **xlab and ylab**: Set the X-axis and Y-axis labels respectively.
* **las**: Control the direction of axis labels, 0 means horizontal, 1 means vertical, 2 means rotated 45 degrees.
* **col and fill**: Set the color and fill color of the box plot.
* **border**: Set the border color of the box plot.
* **outlier.col** and **outlier.pch**: Set the color and shape of outlier points.
* **horizontal**: If set to TRUE, draw a horizontal box plot.
* **varwidth**: If set to TRUE, the width of the box plot will vary according to the sample size, otherwise all box plots have the same width.
* **notch**: If set to TRUE, the box plot will have a notch representing the 95% confidence interval, which can be used to compare the significance of medians.
* **range**: Control the length of whiskers, default is 1.5 times the interquartile range (IQR).
* **par**: Can pass graphical parameters, such as mar (margins), oma (outer margins), etc.
How to read a box plot: Box plots are mainly used to describe the distribution of data, and its key elements include:
* Box (Box): Represents the lower quartile (Q1) and upper quartile (Q3) of the data, that is, the middle 50% of the data.
* Median Line: The line inside the box represents the median of the data.
* Whiskers: Lines extending from both ends of the box, usually representing the minimum (excluding outliers) and maximum values, but not exceeding Q1 minus 1.5 times IQR and Q3 plus 1.5 times IQR.
* Outliers: Data points outside the whiskers, representing values far from the main data set.
## bwplot
## AIC
## fligner.test
Test homogeneity of variance, get p-value, if less than 0.05, reject the null hypothesis
## shapiro.test
Test whether data follows normal distribution, if value is greater than 0.05, consider it to follow normal distribution
## cor.test
## durbinWatsonTest
The Durbin-Watson statistic is a number between 0 and 4, used to evaluate whether the model's residual sequence has autocorrelation. A value close to 2 usually indicates no significant autocorrelation between residuals, while a value far from 2 may indicate the presence of autocorrelation.
## dwtest()
```R
dwtest(object, alternative = c("two.sided", "less", "greater"), lag.max = NULL)
```
The output will include the Durbin-Watson statistic, corresponding p-value, and test conclusion. If the p-value is greater than the significance level (usually 0.05), the null hypothesis cannot be rejected, that is, there is no autocorrelation in the residuals. Conversely, if the p-value is less than the significance level, the model may need adjustment to eliminate autocorrelation in the residuals.
## kruskal.test
## aov
## anova
## par(mfrow=c(x,y),cor = (1,1,2,2))
mfrow defines the array of plots
cor defines the top, bottom, left, and right borders
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
* response: The response variable for classification or regression problems, for classification problems it should be a factor; for regression problems it should be a numeric vector.
* .: Represents all other variables, that is, using all independent variables to predict the response variable.
* data: A data frame containing the response and independent variables.
* control: A tree.control object used to set parameters when building a decision tree, such as maximum tree depth nnode, etc.
## Parametric Tests
T-test:

One-sample T-test: Test whether the mean of a sample is significantly different from a known population mean.
Independent samples T-test (two-sample T-test): Compare whether the mean differences between two independent samples are significant.
Paired samples T-test: Compare the mean differences between paired data (such as measurements before and after treatment on the same subject).
ANOVA (Analysis of Variance):

One-way ANOVA: Used to compare whether there are significant differences in means among three or more independent samples.
Multivariate Analysis of Variance (MANOVA): When there is more than one dependent variable, used to analyze mean differences of multiple dependent variables simultaneously.
Chi-square test (χ² test):

Goodness of fit test: Test whether there are significant differences between observed and expected frequencies.
Independence test: Analyze whether two categorical variables are independent.
Homogeneity test: Test whether the frequency distributions of multiple samples are the same.
F-test:

Homogeneity of variance test: Before ANOVA, test whether the variances of each group are equal.
F-test in ANOVA: Used in ANOVA to determine whether group differences are significant.
## interaction.plot
```R
interaction.plot(x.factor = mydata$Age.Group,
                 trace.factor = mydata$Gender,
                 response = mydata$Salary,
                 type = "b",
                 col = c("red", "blue"),
                 leg.legend = c("Female", "Male"))
```
* x.factor: The factor variable on the X-axis, can be a factor variable or a numeric vector.
* trace.factor: The factor variable on the Y-axis, can be a factor variable or a numeric vector.
* response: The response variable, can be a numeric vector.
* data: Data frame
* type: Type
1. "l" line chart
2. "b" line chart and point chart
3. "p" point chart
4. "o" point chart of overplotting line chart.
5. "c" histogram-style line chart
6. legend: Legend
## groupedData()
Handle repeated measurement data
## radarplot() Radar Chart
```R
radarchart/radarchartcirc(df, axistype, seg, pty, pcol, plty, plwd, pdensity, pangle, pfcol,cglty, cglwd, cglcol, axislabcol, title, maxmin, na.itp, centerzero, vlabels, vlcex, caxislabels, calcex, paxislabels, palcex, ...)
```
* axislabcol: Color of axis labels. Color of axis labels and numbers, default is "blue
* axistype: Type of axis, can be a value between 0 and 5. 0 means no axis labels, 1 means center axis labels, 2 means axis labels around the chart, 3 means both center and peripheral axis labels, 4 is the asterisk format of 1, 5 is the asterisk format of 3. Default is 0
* seg: Number of segments, determines the number of divisions on the axis.
* pty: Type of polygon (line type), a vector specifying point symbols, default is 16 (closed circle). If not drawing data points, should be set to 32.
* pcol: Color of polygon edges, a vector of color codes for drawing data, default is 1:8, will repeat
* plty: Line type of polygon edges. A vector of line types for drawing data, default is 1:6, will repeat
* plwd: Line width of polygon edges.
* pdensity: May be used to control point density, if pcol is used for points rather than lines.
* pangle: May be used to control point angle distribution, if pcol is used.
* pfcol: Fill color inside the polygon. pfcol = scales::alpha("#00AFBB", 0.5); the second parameter of the alpha() function is a value between 0 and 1, indicating the transparency of the color. 0 means completely transparent, 1 means completely opaque. In this example, 0.5 means semi-transparent, so the final pfcol color is 50% transparent blue
* cglty: Line type of grid lines. Line type of radar grid, default is 3 (dashed line). For radarchartcirc(), default is 1 (solid line)
* cglwd: Line width of grid lines. Line width of radar grid, default is 1, represents the thinnest line width
* cglcol: Color of grid lines. Color of radar grid, default is "navy"
* title: Title of the chart. maxmin: May be used to control the display of maximum and minimum values.
* na.itp: How to handle NA values.
* centerzero: Whether to set the chart center to 0.
* vlabels: Labels of variables, usually correspond to column names of the data frame.
* vlcex: Font size of variable labels.
* caxislabels: Axis scale labels.
* calcex: Font size of scale labels.
* paxislabels: Labels of polygon axes.
* palcex: Font size of polygon axis labels.

## legend Legend
```R
legend(x, y, legend, fill = NULL, col = "black", bg = "white",
       lty = 1, lwd = 1, pch = 1, angle = 45, density = NULL, bty = "o",
       box.lwd = 1, box.col = "black", text.col = "black",
       title = NULL, cex = 1, pt.bg = NA, pt.cex = 1,
       xjust = 0, yjust = 1, xpd = NA,
       ncol = 1, horiz = FALSE, title.adj = c(0.5, 0.5), ...)
```