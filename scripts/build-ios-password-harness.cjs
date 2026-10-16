const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('react-native/package.json'));
const source = fs.readFileSync(path.join(root, 'Libraries/Text/TextInput/RCTBackedTextInputDelegateAdapter.mm'), 'utf8');
const start = source.indexOf('- (BOOL)textField:(__unused UITextField *)textField\n');
const end = source.indexOf('- (BOOL)textFieldShouldReturn:', start);
if (start < 0 || end < 0 || !source.includes('&& !textField.secureTextEntry')) throw Error('Patched RN adapter not found');
// Extract the actual installed method, not a reimplementation of its behavior.
const method = source.slice(start, end);
const fieldSource = fs.readFileSync(path.join(root, 'Libraries/Text/TextInput/Singleline/RCTUITextField.mm'), 'utf8');
const fieldStart = fieldSource.indexOf('// Movya: route secure UIKeyInput edits through the RN delegate.');
const fieldEnd = fieldSource.indexOf('#pragma mark - Context Menu', fieldStart);
if (fieldStart < 0 || fieldEnd < 0) throw Error('Patched native field not found');
const fieldMethods = fieldSource.slice(fieldStart, fieldEnd);
const harness = `
#import <UIKit/UIKit.h>
@interface MVChanges : NSObject
@property(nonatomic) NSInteger count;
- (NSString *)textInputShouldChangeText:(NSString *)text inRange:(NSRange)range;
@end
@implementation MVChanges
- (NSString *)textInputShouldChangeText:(NSString *)text inRange:(NSRange)range { return text; }
@end
@interface MVField : UITextField
@property(nonatomic, strong) MVChanges *textInputDelegate;
- (void)setSelectedTextRange:(UITextRange *)range notifyDelegate:(BOOL)notify;
@end
@implementation MVField
- (void)setSelectedTextRange:(UITextRange *)range notifyDelegate:(BOOL)notify { [super setSelectedTextRange:range]; }
${fieldMethods}
@end
@interface MVAdapter : NSObject <UITextFieldDelegate> {
  MVField *_backedTextInputView;
  BOOL _textDidChangeIsComing;
}
- (instancetype)initWithField:(MVField *)field;
- (void)textFieldDidChange;
@end
@implementation MVAdapter
- (instancetype)initWithField:(MVField *)field { self = [super init]; if(self) { _backedTextInputView=field; field.delegate=self; } return self; }
- (void)textFieldDidChange { _backedTextInputView.textInputDelegate.count++; }
${method}
@end
static NSMutableArray *checks;
static void check(BOOL passed, NSString *name) { [checks addObject:@{ @"check": name, @"passed": @(passed) }]; }
@interface MVController : UIViewController
@property(nonatomic,strong) MVField *field;
@property(nonatomic,strong) MVAdapter *adapter;
@end
@implementation MVController
- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), dispatch_get_main_queue(), ^{
    checks=[NSMutableArray new];
    self.field=[[MVField alloc] initWithFrame:CGRectMake(20,80,280,50)];
    self.field.secureTextEntry=YES;
    self.field.textInputDelegate=[MVChanges new];
    self.adapter=[[MVAdapter alloc] initWithField:self.field];
    [self.view addSubview:self.field];
    [self.field becomeFirstResponder];
    [self.field insertText:@"1234"];
    check([self.field.text isEqualToString:@"1234"], @"initial typing");
    for(int i=0;i<3;i++) {
      [self.field resignFirstResponder]; [self.field becomeFirstResponder];
      [self.field insertText:@"56"];
      check([self.field.text isEqualToString:@"123456"], @"append after refocus");
      [self.field resignFirstResponder]; [self.field becomeFirstResponder];
      [self.field deleteBackward];
      check([self.field.text isEqualToString:@"12345"], @"delete one character after refocus");
      [self.field deleteBackward];
      check([self.field.text isEqualToString:@"1234"], @"continue deleting");
      check(self.field.secureTextEntry, @"field remains protected");
    }
    UITextPosition *from=[self.field positionFromPosition:self.field.beginningOfDocument offset:1];
    UITextPosition *to=[self.field positionFromPosition:self.field.beginningOfDocument offset:3];
    self.field.selectedTextRange=[self.field textRangeFromPosition:from toPosition:to];
    [self.field insertText:@"x"];
    check([self.field.text isEqualToString:@"1x4"], @"replace selected characters");
    [self.field selectAll:nil]; [self.field insertText:@"pasted value"];
    check([self.field.text isEqualToString:@"pasted value"], @"replace all with paste");
    check(self.field.textInputDelegate.count>10, @"native changes notify RN");
    BOOL passed=YES; for(NSDictionary *item in checks) if(![item[@"passed"] boolValue]) passed=NO;
    NSDictionary *result=@{ @"passed": @(passed), @"checks": checks };
    NSString *documents=NSSearchPathForDirectoriesInDomains(NSDocumentDirectory,NSUserDomainMask,YES).firstObject;
    [[NSJSONSerialization dataWithJSONObject:result options:0 error:NULL] writeToFile:[documents stringByAppendingPathComponent:@"result.json"] atomically:YES];
  });
}
@end
@interface MVApp : UIResponder <UIApplicationDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation MVApp
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
 self.window=[[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds]; self.window.rootViewController=[MVController new]; [self.window makeKeyAndVisible]; return YES;
}
@end
int main(int argc,char *argv[]) { @autoreleasepool { return UIApplicationMain(argc,argv,nil,NSStringFromClass(MVApp.class)); } }
`;
fs.writeFileSync(process.argv[2], harness);
