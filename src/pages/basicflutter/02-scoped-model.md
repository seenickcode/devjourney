---
setup: |
  import Layout from '../../layouts/Main.astro';
title: scoped_model
publishDate: 21 May 2021
name: Nick Manning
value: 128
description: scoped_model
duration: 10 min read
---

What [`scoped_model`](https://pub.dartlang.org/packages/scoped_model) does is it makes working with state in your app much easier.

Note: you can check out the video for this post [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/scoped-model-hello-world) and the longer, pro video [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).

While it's all well and good to exclusively use `StatefulWidget`, most of the time your app is going to have multiple widgets that need to use the same shared state. The issue with this is that when those widgets exist in various places in our app, passing around state becomes pretty cumbersome. In other words, `scoped_model` makes it easy for various widgets to access the same shared state. There are also some nice additional benefits you get as well:

- It allows us to conveniently consolidate app-wide state variables and business logic.
- We can avoid reading up on overly complex architecture patterns.
- Very minimal boilerplate code is required, compared to similar libraries.

## How Does it Work, Exactly?

`scoped_model` consists of three concepts.

First, it offers a `Model` class. We add whatever state variables we want as well as business logic as well.

Next, for each screen that needs to access this state, we wrap everything with a single `ScopedModel` widget, referring to the instance of our model class we created.

Finally, for any child-widgets that need to access our state (even if they're in separate files), we simply wrap them in a `ScopedModelDescendant` widget. Whatever is wrapped there can automagically react to our state updates.

What I love about this solution is there's no complex architecture or large amount of boilerplate code we have to maintain to achieve this. Now let's implement something simple so that makes more sense.

## Terms We'll Be Throwing Around

- **State**: data. In our case, state changes over time as users interact with the UI. One or more "stateful" widgets may re-render as state changes.
- **Model**: a class that represents a "thing" in our app. Examples: User, Podcast, Episode, etc
- **Scoped Model**: a class that holds state variables and contains business logic
- **Business Logic**: code that affects data in our app, typically grouped by conern. Examples: the Business Logic that determines how we work with fetching and managing Podcasts in our app.
- **Render**: the act of drawing something on the screen, i.e. a Button, Image, etc.

## Let's Dive In

Let's create a simple app to demonstrate `scoped_model`. If you don't want to follow along, you can find the code [here](https://github.com/seenickcode/scoped_model_hello_world). Our app will be a pretty contrived example in order to keep things simple. It will:

- Show a screen with three simple text labels.
- When the plus button at the bottom is tapped, our state is updated.
- Because our labels are wired up to a Scoped Model, they'll get those updates automagically.

## Our Code Just a quick note on how we're organizing our app's code:

- `main.dart`: loads our `App` widget.
- `app.dart`: a `StatelessWidget`, rendering a `MaterialApp`.
- `/models/counter.dart`: a simple model that represents a Counter.
- `/scoped_models/scoped_counters.dart`: our scoped model that contains state variables and state specific business logic.
- `/screens/home/home.dart`: our main screen.
- `/screens/home/widgets/widget1.dart`: a simple stateless widget that shows some hardcoded text with the latest state value appended to it.
- `/screens/home/widgets/widget2.dart`: same as above, just different text and wiring up to another state variable. \* `/screens/home/widgets/widget3.dart`: same as above, just different text and wiring up to another state variable. #

## Step 1: Flutter Create Let's make sure Flutter is up to date and generate a new project:

```shell
flutter upgrade
flutter create scoped_model_hello_world
```

Now, open your project in the IDE of your choice (I personally use [VSCode](https://code.visualstudio.com/)) and replace `main.dart` with the following:

## The Shell of Our App

````dart
// main.dart
import 'package:flutter/material.dart';
import 'app.dart';

void main() => runApp(App());
```

```dart
// app.dart
import 'package:flutter/material.dart';
import 'screens/home/home.dart';

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: MyHomePage(),
    );
  }
}
````

## Defining Our Models A simple model defining a member called `count` with a default value of `1`.

```dart
// /models/counter.dart
class Counter {
  int count = 1;
}
```

This is our (scoped) model. I called it a (scoped) model, even though as you'll see below there's an actual `ScopedModel` widget, because we should separate our traditional models in `/models` with scoped models, which define state variables and the business logic that relates to it. Note that our plain old `Counter` model above may later have its own business logic but our scoped model, `ScopedCounter`, exclusively includes state variables and business logic related to that state. We instantiate three `Counter` objects. When the `increment` method is triggered, we update each of those with a different value. After we update our state, we "notify" any widgets that rely on it via the `notifyListeners()` as seen below. This will trigger any widgets that rely on this state to automatically update, exactly how your standard `StatefulWidget` works:

```dart
// /scoped_models/scoped_counters.dart
import 'package:scoped_model/scoped_model.dart';
import '../models/counter.dart';

class ScopedCounter extends Model {
  Counter counter1 = Counter();
  Counter counter2 = Counter();
  Counter counter3 = Counter();

  increment() {
    counter1.count += 1;
    counter2.count += 5;
    counter3.count += 10;

    notifyListeners();
  }
}
```

## Our Single Screen

This screen was mainly taken from the standard project created by the `flutter create` command, just to ensure it's familiar to everyone. Here we render our three widgets on the screen along with a button that triggers an update to our state. The important widget to notice is is the `ScopedModel` widget below, of type `ScopedCounter` (the class we created above). We wrap our screen with this `ScopedModel` widget, which will provide the functionality we need in each widget below. In other words, from the documentation: "If you need to pass a Model deep down your Widget hierarchy, you can wrap your Model in a ScopedModel Widget. This will make the Model available to all descendant Widgets."

```dart
// /screens/home/home.dart
import 'package:flutter/material.dart';
import 'package:scoped_model/scoped_model.dart';
import '../../scoped_models/scoped_counters.dart';
import 'widget1.dart';
import 'widget2.dart';
import 'widget3.dart';

class MyHomePage extends StatelessWidget {
  final ScopedCounter scopedCounter = ScopedCounter();

  @override
  Widget build(BuildContext context) {
    return ScopedModel<scopedcounter>(
      model: scopedCounter,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Hello World with Scoped Model'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <widget>[
              Widget1(),
              Widget2(),
              Widget3(),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => scopedCounter.increment(),
          tooltip: 'Increment',
          child: Icon(Icons.add),
        ),
      ),
    );
  }
}</widget></scopedcounter> `
```

## Our Child Widgets

Here, we have three simple widgets, each relying on its own instance of `Counter`. Each has a hardcoded string it renders with the latest counter value appended. It's a really contrived example but it's just mean to show how different widgets use the centralized state in our scoped model in its own way. Note that each of these are nice, clean `StatelessWidget`s, not `StatefulWidget`s. This is pretty nice, as the code can stay pretty simple, without much of any business logic.

```dart
// /screens/home/widgets/widget1.dart
import 'package:flutter/material.dart';
import 'package:scoped_model/scoped_model.dart';
import '../../scoped_models/scoped_counters.dart';

class Widget1 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ScopedModelDescendant<scopedcounter>(
        builder: (context, child, model) =>
            Text('Widget1 counter is ${model.counter1.count}'));
  }
}</scopedcounter> `
```

```dart
// /screens/home/widgets/widget2.dart
import 'package:flutter/material.dart';
import 'package:scoped_model/scoped_model.dart';
import '../../scoped_models/scoped_counters.dart';

class Widget2 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ScopedModelDescendant<scopedcounter>(
        builder: (context, child, model) =>
            Text('Widget2 counter is ${model.counter2.count}'));
  }
}</scopedcounter> `
```

```dart
// /screens/home/widgets/widget3.dart
import 'package:flutter/material.dart';
import 'package:scoped_model/scoped_model.dart';
import '../../scoped_models/scoped_counters.dart';

class Widget3 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ScopedModelDescendant<scopedcounter>(
        builder: (context, child, model) =>
            Text('Widget3 counter is ${model.counter3.count}'));
  }
}</scopedcounter> `
```

## Summary

That's it. If you want to check out the free 10 minute video for this post, where I go into explaining things a bit more in detail, you can check it out <a href="">here</a>. The code for this post can be found [here](https://github.com/seenickcode/scoped_model_hello_world). If you want to check out a more realistic example of `scoped_model`, sign up for the Pro subscription [here](https://fluttercrashcourse.com/courses/pro-essentials/lessons/pro-scoped-model).

Happy Fluttering, Nick
