# Bug Catcher
This is a utility for collecting and debugging bug reports from a netsblox deployment.

Bug reports are grouped into bugs where the report is just another instance of a person encountering the given bug. That is, each report is associated with a bug (which we would like to fix). Until we fix a bug, we don't really know that all the reports associated with a bug are actually caused by the same underlying issue. As a result, we just group bug reports by a suspected underlying issue.

By default the reports are grouped by the error message. These default groups can be further split into separate bugs by testing them with various conditions. For example, suppose there are 10 bug reports with some given error message. If 3 of them occurred when collaborating, we could run

```
bug-catcher split BUG_REPORT_ID isCollaborating
```

and now the bug-catcher would split the previous bug reports into two groups, one where the reports occurred during collaboration and one where the reports occurred w/ only a single user.


## Quick Start
```
npm install -g netsblox/bug-catcher
bug-catcher listen 8000
```

Now the bug-catcher will start a server listening on port 8000. Setting the `REPORT_URL` environment variable to this endpoint will allow netsblox to report any bug reports (manually reported, client, compiler, or websocket messages) to the bug-catcher.

These captured reports can then be interacted with using the `bug-catcher` cli. Running `bug-catcher ls` should show all known bugs.
